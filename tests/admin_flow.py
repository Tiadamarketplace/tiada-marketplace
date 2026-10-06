"""Browser test of public/admin.html against a fake /api/admin."""
import json, sys, threading, time, functools, http.server, pathlib, re, copy
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from mock_api import catalog, rows

PUB = pathlib.Path(__file__).parent.parent / 'public'
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, path):
        import re as _re
        p = path.split('?')[0]
        if p == '/' or _re.fullmatch(r'/(catalog|wishlist|basket|account|track|guide|privacy|checkout|pay|success|search|aisle)/?', p): path = '/shop.html'
        return super().translate_path(path)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8766), functools.partial(H, directory=str(PUB)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

CAT = catalog()
iso = lambda t=0: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + t))
def order(i, status, mins):
    return {'id': f'TD-8495{i}', 'email': f'buyer{i}@mail.test', 'name': ['Ada Obi', 'Tunde Bello', 'Kemi Ade'][i % 3], 'phone': '08031234567', 'address': '14 Admiralty Way', 'landmark': '',
            'zone_id': 'z5', 'area_label': 'Lekki', 'speed': 'next', 'speed_label': 'Next-day standard', 'items': [{'pid': 'milo', 'name': 'Milo', 'size': '500g', 'qty': 2, 'price': 6500, 'swaps': []}],
            'subtotal': 13000, 'discount': 0, 'delivery_fee': 3000, 'total': 16000, 'kg': 1, 'status': status, 'prev_status': None, 'paid_at': iso(-mins * 60), 'created_at': iso(-mins * 60),
            'rider': None, 'confirm': None, 'issue': None, 'refunds': [], 'note': None}
st = {'me': None, 'needed': True, 'orders': [order(0, 'new', 5), order(1, 'packed', 90), order(2, 'done', 60 * 30)], 'calls': [],
      'chats': [{'id': '11111111-1111-4111-8111-111111111111', 'customer_id': None, 'name': 'Guest', 'email': None, 'status': 'waiting', 'agent': None, 'created_at': iso(-120), 'updated_at': iso(-60),
                 'messages': [{'id': 1, 'chat_id': '1', 'who': 'me', 'text': 'Can I talk to someone?', 'created_at': iso(-90)}, {'id': 2, 'chat_id': '1', 'who': 'bot', 'text': 'Sure, someone will join.', 'created_at': iso(-80)}]}]}

def data():
    sets = {'layout': CAT['layout'], 'tiles': CAT['tiles'], 'aisles': CAT['aisles'], 'fees': CAT['fees'], 'store': CAT['store'], 'vouchers': {'TIADACARE': 500}}
    return {'me': st['me'], 'orders': st['orders'], 'products': CAT['products'], 'promos': [dict(p, is_on=True, cls=p.get('cls', '')) for p in CAT['promos']], 'zones': CAT['zones'],
            'reviews': [{'id': '22222222-2222-4222-8222-222222222222', 'product_id': 'milo', 'order_id': 'TD-84952', 'name': 'Kemi A.', 'stars': 5, 'text': 'Lovely and fresh', 'status': 'pending', 'reply': None, 'created_at': iso(-3600)}],
            'activity': [{'staff_name': 'Grace Thomas', 'text': 'Signed in with two-step check', 'created_at': iso(-10)}],
            'customers': [{'id': 'c1', 'email': 'buyer0@mail.test', 'name': 'Ada Obi', 'phone': '08031234567', 'promo_ok': True, 'created_at': iso(-9999)}],
            'chats': st['chats'], 'messages': [{'id': 'm1', 'order_id': 'TD-84950', 'kind': 'placed', 'email_to': 'buyer0@mail.test', 'email_ok': True, 'data': {}, 'created_at': iso(-300)}],
            'settings': sets, 'staff': [{'id': 's1', 'email': 'grace@mail.test', 'name': 'Grace Thomas', 'role': 'Owner', 'active': True}], 'now': 0}

def handle(route, req):
    path = re.sub(r'^https?://[^/]+', '', req.url).split('?')[0]
    body = json.loads(req.post_data) if req.post_data else {}
    st['calls'].append((req.method, path, body))
    J = lambda d, s=200: route.fulfill(status=s, content_type='application/json', body=json.dumps(d))
    if path == '/api/admin/me': return J({'staff': st['me']})
    if path == '/api/admin/setup':
        if req.method == 'GET': return J({'needed': st['needed']})
        if body['action'] == 'start':
            if body['token'] != 'setup-key': return J({'error': 'That setup key is wrong.'}, 403)
            return J({'ticket': 't', 'qr': 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', 'secret': 'ABCDEF234567'})
        if body['code'] != '123456': return J({'error': 'That code doesn’t match.'}, 400)
        st['me'] = {'name': 'Grace Thomas', 'email': 'grace@mail.test', 'role': 'Owner'}; st['needed'] = False
        return J({'staff': st['me']})
    if path == '/api/admin/login':
        return J({'ticket': 't'}) if body['step'] == 'pw' else J({'staff': st['me']})
    if path == '/api/admin/reset':
        if body['action'] == 'request': return J({'message': 'If that email belongs to a staff account, a reset link is on its way.'})
        if body['action'] == 'finish':
            if body.get('code') != '123456': return J({'error': 'That code isn’t right.'}, 401)
            return J({'done': True, 'email': 'grace@mail.test'})
        if path == '/api/admin/logout': st['me'] = None; return J({'ok': True})
    if path == '/api/admin/data':
        if 'part=chats' in req.url: return J({'chats': st['chats']})
        return J(data())
    m = re.match(r'/api/admin/orders/(TD-\d+)', path)
    if m:
        o = next(x for x in st['orders'] if x['id'] == m.group(1))
        a = body['action']
        o['status'] = {'packed': 'packed', 'route': 'route', 'done': 'done', 'issue': 'issue', 'cancel': 'cancelled'}.get(a, o['status'])
        if a == 'route': o['rider'] = {'partner': body['partner'], 'tracking': body['tracking'], 'driver': body.get('driver', ''), 'phone': body.get('phone', ''), 'cost': body.get('cost', 0)}
        return J({'order': o, 'email': {'ok': True}})
    if path == '/api/admin/chat':
        c = st['chats'][0]
        if body['action'] == 'join': c['status'] = 'open'; c['agent'] = 'Grace'; c['messages'].append({'id': 3, 'chat_id': '1', 'who': 'sys', 'text': 'Grace has joined the chat', 'created_at': iso()})
        if body['action'] == 'send': c['messages'].append({'id': len(c['messages']) + 1, 'chat_id': '1', 'who': 'agent', 'text': body['text'], 'created_at': iso()})
        return J({'ok': True})
    if path == '/api/admin/broadcast': return J({'sent': 1, 'total': 1})
    return J({'ok': True})

errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 860})
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'status of 4' not in m.text and errors.append(m.text))
    pg.route('**/api/**', handle)
    pg.goto('http://127.0.0.1:8766/admin.html?test=1')
    pg.wait_for_selector('#f-setup', timeout=8000)
    pg.screenshot(path=str(OUT / 'a1_setup.png'))
    pg.fill('#s-name', 'Grace Thomas'); pg.fill('#s-email', 'grace@mail.test'); pg.fill('#s-pw', 'longpassword1'); pg.fill('#s-token', 'wrong')
    pg.click('#f-setup button[type=submit]'); pg.wait_for_timeout(600)
    assert 'setup key is wrong' in pg.content()
    pg.fill('#s-token', 'setup-key'); pg.fill('#s-pw', 'longpassword1'); pg.click('#f-setup button[type=submit]')
    pg.wait_for_selector('#f-setup2', timeout=4000); pg.screenshot(path=str(OUT / 'a2_qr.png'))
    pg.fill('#otp1', '123456'); pg.wait_for_selector('.app', timeout=6000); pg.wait_for_timeout(800)
    pg.screenshot(path=str(OUT / 'a3_dash.png'))
    assert 'TD-84950' in pg.content()

    # orders: pack the new one, then dispatch it
    pg.click('[data-view=orders]'); pg.wait_for_timeout(900)
    pg.click('[data-osel="TD-84950"]'); pg.wait_for_timeout(400)
    pg.click('[data-oact=pack]'); pg.wait_for_timeout(900)
    assert any(c[1] == '/api/admin/orders/TD-84950' and c[2] == {'action': 'packed'} for c in st['calls'])
    pg.click('[data-oact=dispatch]'); pg.wait_for_selector('#f-dispatch'); pg.wait_for_timeout(300)
    pg.fill('#d-trk', 'KWK-1001'); pg.fill('#d-driver', 'Musa'); pg.fill('#d-ph', '08012345678'); pg.fill('#d-cost', '2200')
    pg.click('#f-dispatch button[type=submit]'); pg.wait_for_timeout(1200)
    sent = [c[2] for c in st['calls'] if c[1] == '/api/admin/orders/TD-84950'][-1]
    assert sent['action'] == 'route' and sent['tracking'] == 'KWK-1001' and sent['cost'] == 2200, sent
    pg.screenshot(path=str(OUT / 'a4_orders.png'))

    # inventory: hide a product, change stock
    pg.click('[data-view=inventory]'); pg.wait_for_timeout(900)
    pg.click('[data-hide=milo]'); pg.wait_for_timeout(400)
    pg.click('[data-stk="milo|1"]'); pg.wait_for_timeout(400)
    pats = [c[2] for c in st['calls'] if c[0] == 'PATCH']
    assert {'id': 'milo', 'hidden': True} in pats and {'id': 'milo', 'stockDelta': 1} in pats, pats
    pg.screenshot(path=str(OUT / 'a5_inventory.png'))

    # layout: switch off a section
    pg.click('[data-view=layout]'); pg.wait_for_timeout(900)
    pg.click('.sec:nth-child(3) .switch'); pg.wait_for_timeout(500)
    lay = [c[2] for c in st['calls'] if c[1] == '/api/admin/settings'][-1]
    assert lay['key'] == 'layout' and [x for x in lay['value'] if x[0] == 'flash'][0][1] is False, lay

    # chat: join and reply
    pg.click('[data-view=chat]'); pg.wait_for_timeout(900)
    pg.click('[data-act=cjoin]'); pg.wait_for_timeout(900)
    pg.fill('#c-text', 'Hello, how can I help?'); pg.press('#c-text', 'Enter'); pg.wait_for_timeout(1200)
    assert 'Grace has joined the chat' in pg.content() and 'Hello, how can I help?' in pg.content()
    pg.screenshot(path=str(OUT / 'a6_chat.png'))

    # a new order arrives on the next refresh
    st['orders'].insert(0, order(3, 'new', 0)); st['orders'][0]['id'] = 'TD-84960'
    pg.evaluate('T.refresh().then(T.render)'); pg.wait_for_timeout(700)
    assert 'TD-84960' in pg.inner_html('#alertbar')
    pg.screenshot(path=str(OUT / 'a7_alert.png'))

    # forgot password: request a link, then open it
    pg.click('[data-view=dash]'); pg.wait_for_timeout(500); pg.click('[data-act=logout]'); pg.wait_for_selector('#f-login', timeout=5000)
    pg.click('[data-act=lforgot]'); pg.fill('#fg-email', 'grace@mail.test'); pg.click('#f-forgot button[type=submit]'); pg.wait_for_timeout(800)
    assert 'reset link is on its way' in pg.content()
    pg.screenshot(path=str(OUT / 'a9_forgot.png'))
    pg.goto('http://127.0.0.1:8766/admin.html?test=1&x=1#reset=abc.def.ghi'); pg.wait_for_selector('#f-reset', timeout=8000)
    assert 'reset=' not in pg.url
    pg.fill('#rs-pw', 'newpassword12'); pg.fill('#rs-pw2', 'newpassword12'); pg.fill('#otp1', '000000'); pg.wait_for_timeout(900)
    print('reset box:', repr(pg.inner_text('.lbox')[:400]), [c for c in st['calls'] if 'reset' in c[1]]); assert 'isn’t right' in pg.inner_text('.lbox')
    pg.fill('#rs-pw', 'newpassword12'); pg.fill('#rs-pw2', 'newpassword12'); pg.fill('#otp1', '123456'); pg.wait_for_timeout(1200)
    pg.screenshot(path=str(OUT / 'a10_reset.png'))
    assert pg.is_visible('#f-login') and pg.input_value('#l-email') == 'grace@mail.test'
    fin = [c[2] for c in st['calls'] if c[1] == '/api/admin/reset'][-1]
    assert fin == {'action': 'finish', 'token': 'abc.def.ghi', 'password': 'newpassword12', 'code': '123456'}, fin
    b.close()
    print('calls:', sorted({f'{m} {pth}' for m, pth, _ in st['calls']}))
    print('JS errors:', errors or 'none'); print('ALL PASSED'); sys.exit(0)
    # security page
    pg.click('[data-view=security]'); pg.wait_for_timeout(900)
    pg.screenshot(path=str(OUT / 'a8_security.png'))
    assert 'Add a staff member' in pg.content()
    b.close()
print('calls:', sorted({f'{m} {pth}' for m, pth, _ in st['calls']}))
print('JS errors:', errors or 'none')
print('ALL PASSED')
