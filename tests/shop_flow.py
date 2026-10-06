"""Browser test of public/shop.html against a fake /api (tests/mock_api.py).
Covers: store loads from the API, sign in with an email code, checkout, real transfer account, payment confirmed, tracking, chat hand-over."""
import json, sys, threading, time, functools, http.server, pathlib, re
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from mock_api import catalog

PUB = pathlib.Path(__file__).parent.parent / 'public'
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp')

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(H, directory=str(PUB)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

CAT = catalog()
st = {'user': None, 'orders': [], 'paid': False, 'chat': [], 'chat_status': 'bot', 'calls': []}
now = lambda: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

def order_row():
    return {'id': 'TD-84950', 'email': 'ada@example.com', 'name': 'Ada Obi', 'phone': '08031234567', 'address': '14 Admiralty Way, Lekki',
            'area_label': 'Lekki', 'zone_id': 'z5', 'speed': 'next', 'speed_label': 'Next-day standard', 'kg': 1.5, 'items': [{'pid': 'milo', 'name': 'Milo', 'size': '500g', 'qty': 1, 'price': 6500}],
            'subtotal': 6500, 'discount': 0, 'delivery_fee': 3500, 'total': 10000, 'status': 'new' if st['paid'] else 'pending',
            'rider': None, 'issue': None, 'refunds': [], 'created_at': now(), 'updated_at': now()}

def handle(route, req):
    url, method = req.url, req.method
    path = re.sub(r'^https?://[^/]+', '', url).split('?')[0]
    body = json.loads(req.post_data) if req.post_data else {}
    st['calls'].append((method, path, body))
    J = lambda d, s=200: route.fulfill(status=s, content_type='application/json', body=json.dumps(d))
    if path == '/api/catalog': return J(CAT)
    if path == '/api/me' and method == 'GET': return J({'user': st['user'], 'addresses': []} if st['user'] else {'user': None})
    if path == '/api/me/orders': return J({'orders': [order_row()] if st['paid'] else [], 'emails': []})
    if path == '/api/me/messages': return J({'messages': [{'id': '6f1c1a8e-0000-4000-8000-000000000001', 'order_id': 'TD-84950', 'kind': 'placed', 'title': 'Order confirmed', 'body': 'We confirmed ₦10,000', 'read': False, 'created_at': now()}] if st['paid'] else []})
    if path == '/api/auth/start': return J({'sent': True})
    if path == '/api/auth/verify':
        if body.get('code') != '111111': return J({'error': 'That code is wrong. 4 tries left.'}, 400)
        st['user'] = {'id': 'u1', 'email': body['email'], 'name': body.get('name') or 'Ada Obi', 'phone': None, 'promo_ok': False}
        return J({'user': st['user'], 'isNew': True})
    if path == '/api/auth/logout': st['user'] = None; return J({'ok': True})
    if path == '/api/checkout':
        assert body['name'] and body['email'] and body['zone_id'], body
        return J({'order': {'id': 'TD-84950', 'total': 10000, 'speed': 'Next-day standard'}, 'ref': 'TDA_x',
                  'account': {'bank': 'Wema Bank', 'number': '9912345678', 'name': 'PAYSTACK-TIADA', 'expires_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 1800))}})
    if path.endswith('/check'):
        return J({'status': 'pending', 'message': 'We haven’t received the transfer yet.'})
    if path.endswith('/status'):
        return J({'status': 'new', 'order': order_row()} if st['paid'] else {'status': 'pending', 'order': None})
    if path == '/api/track':
        st_row = order_row(); st_row.update(status='route', rider={'partner': 'Kwik', 'tracking': 'KW-123', 'driver': 'Tunde', 'phone': '08011112222'})
        return J({'order': st_row})
    if path == '/api/reviews': return J({'reviews': [], 'canReview': False, 'mine': None})
    if path == '/api/chat':
        if method == 'GET':
            msgs = [m for m in st['chat'] if m['id'] > int(re.search(r'after=(\d+)', url).group(1))]
            return J({'status': st['chat_status'], 'agent': 'Ada' if st['chat_status'] == 'open' else None, 'messages': msgs})
        a = body['action']
        if a == 'start': return J({'id': '6f1c1a8e-0000-4000-8000-0000000000aa', 'token': 't'})
        if a == 'escalate': st['chat_status'] = 'waiting'; return J({'status': 'waiting'})
        if a == 'send': return J({'id': 1})
        if a == 'end': st['chat_status'] = 'closed'; return J({'status': 'closed'})
    return J({'error': 'not mocked ' + path}, 404)

errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and errors.append(m.text))
    pg.route('**/api/**', handle)
    pg.goto('http://127.0.0.1:8765/shop.html?test=1')
    pg.wait_for_selector('article.pc', timeout=10000)
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(OUT / 't1_home.png'))
    assert 'Milo' in pg.content(), 'catalogue did not load'

    # sign in with an email code
    pg.evaluate("T.go('account')"); pg.wait_for_timeout(1200)
    pg.screenshot(path=str(OUT / 't2_account.png'))
    pg.fill('#au-name', 'Ada Obi'); pg.fill('#au-email', 'ada@example.com'); pg.check('#au-agree')
    pg.click('#auth-email button[type=submit]'); pg.wait_for_selector('#au-code', timeout=5000)
    pg.fill('#au-code', '000000'); pg.wait_for_timeout(1500)
    assert 'That code is wrong' in pg.content(), 'wrong code not reported'
    pg.fill('#au-code', '111111'); pg.wait_for_timeout(2500)
    pg.screenshot(path=str(OUT / 't3_signed_in.png'))
    assert pg.evaluate('!!T.S.user'), 'not signed in'

    # basket + checkout
    pg.evaluate("T.S.cart=[{pid:'milo',size:'500g',qty:1},{pid:'cornflakes',size:'500g',qty:1}];T.save();T.go('checkout')"); pg.wait_for_timeout(1200)
    pg.fill('#co-phone', '08031234567'); pg.fill('#co-addr', '14 Admiralty Way, Lekki')
    pg.select_option('#co-zone', 'z5'); pg.wait_for_timeout(500)
    assert pg.input_value('#co-name') == 'Ada Obi', 'name not prefilled'
    pg.screenshot(path=str(OUT / 't4_checkout.png'), full_page=True)
    pg.click('[data-act=pay]'); pg.wait_for_selector('[data-act=paid-check]', timeout=6000)
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(OUT / 't5_pay.png'))
    assert '9912345678' in pg.content() and 'PAYSTACK-TIADA' in pg.content()
    pg.click('[data-act=paid-check]'); pg.wait_for_timeout(1500)
    assert 'Not received yet' in pg.content() or 'haven’t received' in pg.content()
    st['paid'] = True
    pg.wait_for_selector('.ok .code', timeout=8000); pg.wait_for_timeout(800)
    pg.screenshot(path=str(OUT / 't6_success.png'))
    assert pg.evaluate('T.S.cart.length') == 0

    # track
    pg.evaluate("T.S.track={code:'TD-84950',last4:'4567',res:null,err:''};T.go('track')"); pg.wait_for_timeout(1000)
    pg.click('#track-form button[type=submit]'); pg.wait_for_timeout(1800)
    pg.screenshot(path=str(OUT / 't7_track.png'), full_page=True)
    assert 'Kwik' in pg.content() and 'KW-123' in pg.content()

    # inbox shows the real message
    pg.evaluate("T.go('account');T.S.accView='inbox';T.render()"); pg.wait_for_timeout(1000)
    assert 'Order confirmed' in pg.content()

    # chat hand-over
    pg.evaluate("T.openChat()"); pg.wait_for_timeout(1500)
    pg.fill('#chat-text', 'person'); pg.press('#chat-text', 'Enter'); pg.wait_for_timeout(1500)
    st['chat_status'] = 'open'
    st['chat'] = [{'id': 5, 'who': 'sys', 'text': 'Ada has joined the chat', 'created_at': now()}, {'id': 6, 'who': 'agent', 'text': 'Hi, I’m Ada. How can I help?', 'created_at': now()}]
    pg.wait_for_timeout(4000)
    pg.screenshot(path=str(OUT / 't8_chat.png'))
    html = pg.inner_html('#chat')
    assert 'Ada has joined' in html and 'How can I help' in html, html[-600:]
    b.close()

print('API calls:', sorted({f'{m} {pth}' for m, pth, _ in st['calls']}))
print('JS errors:', errors or 'none')
print('ALL PASSED')
