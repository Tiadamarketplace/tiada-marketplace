"""Screenshot every shop page on phone and desktop against the fake API (for design review)."""
import json, sys, threading, time, functools, http.server, pathlib, re
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from mock_api import catalog
PUB = pathlib.Path(__file__).parent.parent / 'public'
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/tour'); OUT.mkdir(parents=True, exist_ok=True)
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, path):
        p = path.split('?')[0]
        if p == '/' or re.fullmatch(r'/(catalog|wishlist|basket|account|track|guide|privacy|checkout|pay|success|search|aisle)/?', p): path = '/shop.html'
        return super().translate_path(path)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8790), functools.partial(H, directory=str(PUB)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
CAT = catalog(); now = lambda: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
USER = {'id': 'u1', 'email': 'ada@example.com', 'name': 'Ada Obi', 'phone': '08031234567', 'promo_ok': True}
def order(id_, st, total):
    return {'id': id_, 'email': 'ada@example.com', 'name': 'Ada Obi', 'phone': '08031234567', 'address': '14 Admiralty Way', 'area_label': 'Lekki', 'zone_id': 'z5', 'speed': 'next',
            'speed_label': 'Standard delivery', 'kg': 1.5, 'items': [{'pid': 'milo', 'name': 'Milo', 'size': '500g', 'qty': 1, 'price': 6500}, {'pid': 'cornflakes', 'name': 'Cornflakes', 'size': '500g', 'qty': 2, 'price': 3900}],
            'subtotal': total - 3000, 'discount': 0, 'delivery_fee': 3000, 'total': total, 'status': st, 'rider': {'partner': 'Kwik', 'tracking': 'KW-2231', 'driver': 'Tunde', 'phone': '08011112222'} if st == 'route' else None,
            'issue': None, 'refunds': [], 'created_at': now(), 'updated_at': now()}
ORDERS = [order('TD-84951', 'route', 17300), order('TD-84927', 'done', 15500)]
signed = {'v': True}
def handle(route, req):
    path = re.sub(r'^https?://[^/]+', '', req.url).split('?')[0]
    J = lambda d, s=200: route.fulfill(status=s, content_type='application/json', body=json.dumps(d))
    if path == '/api/catalog': return J(CAT)
    if path == '/api/me': return J({'user': USER if signed['v'] else None, 'addresses': [{'id': 'a1', 'label': 'Home', 'street': '14 Admiralty Way', 'landmark': 'Near Total', 'zone_id': 'z5', 'created_at': now()}] if signed['v'] else []})
    if path == '/api/me/orders': return J({'orders': ORDERS if signed['v'] else [], 'emails': []})
    if path == '/api/me/messages': return J({'messages': [{'id': '6f1c1a8e-0000-4000-8000-000000000001', 'order_id': 'TD-84951', 'kind': 'placed', 'title': 'Order confirmed', 'body': 'We confirmed ₦17,300', 'read': False, 'created_at': now()}] if signed['v'] else []})
    if path == '/api/track': return J({'order': ORDERS[0]})
    if path == '/api/reviews': return J({'reviews': [], 'canReview': False, 'mine': None})
    if path == '/api/chat': return J({'id': '6f1c1a8e-0000-4000-8000-0000000000aa', 'token': 't'})
    if path.endswith('/status'): return J({'status': 'pending', 'order': None})
    return J({'ok': True})
SHOTS = [
 ('home', '/', None), ('catalog', '/catalog', None), ('aisle', '/aisle?id=cat:cereal', None), ('search', '/search?q=milo', None),
 ('product', '/', "T.openProduct?T.openProduct('milo'):document.querySelector('[data-open=milo]').click()"),
 ('wishlist', '/wishlist', "T.S.wish=['milo','cornflakes','goldenmorn'];T.save();T.render()"),
 ('basket', '/basket', "T.S.cart=[{pid:'milo',size:'500g',qty:1},{pid:'cornflakes',size:'500g',qty:2},{pid:'cc1',size:'Package',qty:1}];T.save();T.render()"),
 ('checkout', '/checkout', "T.S.cart=[{pid:'milo',size:'500g',qty:1},{pid:'cornflakes',size:'500g',qty:2},{pid:'cc1',size:'Package',qty:1}];T.save();T.render()"),
 ('pay', '/basket', "T.S.pay={id:'TD-84951',total:33800,acct:{bank:'Wema Bank',number:'9912345678',name:'Tiada Marketplace / TD-84951'},expires:Date.now()+29*60000,ref:'x',speed:'Standard delivery'};T.save();T.S.route='pay';T.render()"),
 ('auth', '/account', 'SIGNOUT'), ('account', '/account', None), ('acc-profile', '/account?v=profile', None), ('acc-orders', '/account?v=orders', None),
 ('acc-inbox', '/account?v=inbox', None), ('acc-addresses', '/account?v=addresses', None), ('acc-privacy', '/account?v=privacy', None), ('acc-help', '/account?v=help', None),
 ('track', '/track?code=TD-84951', None), ('guide', '/guide', None), ('privacy', '/privacy', None), ('chat', '/', 'T.openChat()'),
]
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for dev, vp in [('m', {'width': 390, 'height': 844}), ('d', {'width': 1440, 'height': 900})]:
        ctx = b.new_context(viewport=vp, device_scale_factor=1)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.route('**/api/**', handle)
        for name, url, js in SHOTS:
            if ONLY and name not in ONLY: continue
            signed['v'] = js != 'SIGNOUT'
            pg.goto('http://127.0.0.1:8790' + url + ('&' if '?' in url else '?') + 'test=1')
            try: pg.wait_for_function('window.T && document.querySelector("#loader").hidden', timeout=12000)
            except Exception: pass
            pg.evaluate("var c=document.querySelector('#consent');if(c){var b=[...c.querySelectorAll('button')].find(x=>/Essential/.test(x.textContent));if(b)b.click();c.innerHTML=''}")
            if js and js != 'SIGNOUT':
                pg.evaluate(js); pg.wait_for_timeout(900)
                try: pg.wait_for_function('document.querySelector("#loader").hidden', timeout=8000)
                except Exception: pass
            if name == 'track':
                try: pg.fill('#tr-last4', '4567'); pg.click('#track-form button[type=submit]'); pg.wait_for_timeout(1500)
                except Exception: pass
            pg.wait_for_timeout(700)
            pg.screenshot(path=str(OUT / f'{name}_{dev}.png'), full_page=(name not in ('product', 'chat', 'pay')))
        ctx.close()
    b.close()
print('errors:', errors or 'none')
