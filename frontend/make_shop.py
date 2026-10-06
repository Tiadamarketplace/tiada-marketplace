"""Builds public/shop.html from the screen design (shop_src.html) plus the live layer (live_shop.js).
Run:  python3 frontend/make_shop.py
Every replacement must match exactly once, so a design change that breaks the merge fails loudly."""
import pathlib, re, sys

here = pathlib.Path(__file__).parent
s = (here / 'shop_src.html').read_text()
live = (here / 'live_shop.js').read_text()

def sub(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f'make_shop: expected {count} match(es), found {n}:\n  {old[:120]}')
    s = s.replace(old, new)

def resub(pat, new, count=1):
    global s
    s, n = re.subn(pat, new, s, flags=re.S)
    if n != count:
        sys.exit(f'make_shop: regex expected {count}, found {n}: {pat[:100]}')

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cut">
<meta name="theme-color" content="#0B3A23">
<meta name="description" content="Tiada Marketplace: foodstuffs, cereals and combo packs delivered across Lagos and all of Nigeria. Pay by bank transfer, track every order.">
<meta property="og:title" content="Tiada Marketplace">
<meta property="og:description" content="Foodstuffs and cereals delivered anywhere in Nigeria.">
<meta property="og:image" content="/logo-sm.png">
<link rel="icon" type="image/png" href="/icon-sm.png">
<link rel="apple-touch-icon" href="/icon-sm.png">
<style>body:has(.scrim) .consent{display:none}</style>
'''
sub('<meta charset="utf-8">\n', HEAD)

# ---------- assets: real files instead of inlined base64 ----------
sub('data:image/png;base64,__ICON__', '/icon-sm.png', 2)
sub('data:image/png;base64,__FULL__', '/logo-sm.png')
resub(r'<svg width="0" height="0"[^\n]*__PHOTODEFS__</defs></svg>\n', '')

# ---------- prototype leftovers ----------
resub(r'<div class="proto" id="proto">.*?</div>\n', '')
sub('const PHOTOS=new Set(__PHOTOKEYS__);\nfunction art(p){\n', 'function drawArt(p){\n')
resub(r"\n  if\(PHOTOS\.has\(p\.id\)\)return [^\n]*", '')
resub(r"\nconst purchased=pid=>S\.orders\.some[^\n]*", '')
resub(r"\nconst onSale=\(\)=>ALL\.filter[^\n]*", '')
sub('function openProduct(id){', 'function openProductSync(id){')
resub(r"\n\s*<p class=\"demo\">Prototype: try TD-84902 with 4567</p>", '')
resub(r"\n\s*<p class=\"demo\">Prototype: use code <b>123456</b></p>", '')
sub('<span class="hint">Includes sample reviews</span>', '<span class="hint">From verified buyers</span>')
sub("'On the live site the distance is worked out from your address with Google Maps.'", "'Your fee depends on your area and the weight of your basket.'")

# start empty: no sample basket, orders, addresses or inbox
resub(r"cart:store\.get\('cart',\[.*?\]\),", "cart:store.get('cart',[]),")
resub(r"wish:store\.get\('wish',\[.*?\]\),", "wish:store.get('wish',[]),")
resub(r"orders:store\.get\('orders3',\[.*?\n  \]\),", "orders:store.get('orders3',[]),")
resub(r"addresses:store\.get\('addresses',\[.*?\]\),", "addresses:store.get('addresses',[]),")
sub("inbox:store.get('inbox',null)", "inbox:store.get('inbox',[])")
resub(r"hist:store\.get\('hist',\[.*?\]\)", "hist:store.get('hist',[])")

# checkout asks for the customer's name (needed on the order and the emails)
sub('''<div class="panel" style="margin-bottom:14px"><h3>Contact</h3>
        <div class="field ${fieldState('email')}">''',
    '''<div class="panel" style="margin-bottom:14px"><h3>Contact</h3>
        <div class="field"><label for="co-name">Your name</label><input id="co-name" autocomplete="name" maxlength="60" placeholder="e.g. Adeola Oladipo" value="${esc(S.co.name||(S.user&&S.user.name)||'')}"></div>
        <div class="field ${fieldState('email')}">''')
sub("if(S.user&&!S.co.phone)S.co.phone=S.user.phone;", "if(S.user&&!S.co.phone)S.co.phone=S.user.phone;if(S.user&&!S.co.name)S.co.name=S.user.name;")
sub("'<p class=\"hint\" style=\"margin:8px 0 0\">Add your email, phone, address and area to continue.</p>'",
    "'<p class=\"hint\" style=\"margin:8px 0 0\">Add your name, email, phone, address and area to continue.</p>'")

# live chat: the real staff member's name instead of "Ruka"
sub("${agentOn?'R':`<img", "${agentOn?esc((CH.agent||'T')[0]):`<img")
sub("${agentOn?'Ruka · Tiada support':'Tiada assistant'}", "${agentOn?esc(CH.agent||'Tiada')+' · Tiada support':'Tiada assistant'}")
sub("${m.who==='agent'?'<span class=\"cav sm agent\">R</span>':''}", "${m.who==='agent'?`<span class=\"cav sm agent\">${esc((CH.agent||'T')[0])}</span>`:''}")
sub("${m.who==='agent'?'<span class=\"cname\">Ruka</span>':''}", "${m.who==='agent'?`<span class=\"cname\">${esc(CH.agent||'Tiada')}</span>`:''}")
sub("${agentOn?'<span class=\"cav sm agent\">R</span>':''}", "${agentOn?`<span class=\"cav sm agent\">${esc((CH.agent||'T')[0])}</span>`:''}")
sub("${agentOn?'Message Ruka…'", "${agentOn?'Message '+esc(CH.agent||'our team')+'…'")
sub("'Prototype: Ruka’s replies are simulated. On the live site she replies from the admin desk.'", "'You’re chatting with a real person from the Tiada team.'")
sub("Our team is notified and <b>Ruka</b> joins the same chat.", "Our team is notified and a team member joins the same chat.")

# words that change with the real sign-in and payment
sub("valid for 20 minutes.", "valid for 30 minutes.")
sub("'Before you send, check the account name reads <b>Tiada Marketplace / Order …</b>.',", "'Before you send, check the account name in your bank app matches the one on the payment page.',")
sub("and it expires after 20 minutes. Always check the account name reads “Tiada Marketplace / Order …” before you send.", "and it expires after 30 minutes. Always check the account name in your bank app matches the payment page before you send.")
sub("Check that the account name reads <b>Tiada Marketplace / Order …</b> before you send. The account expires after 20 minutes.", "Check that the account name in your bank app matches the payment page before you send. The account expires after 30 minutes.")
sub("'<b>Sign in</b> with your phone number and a 6-digit code. There’s no password to remember.',", "'<b>Sign in</b> with your email and a 6-digit code we email you. There’s no password to remember.',")
sub("Sign in from <b>Account</b> with your phone number. We text you a 6-digit code,", "Sign in from <b>Account</b> with your email. We email you a 6-digit code,")
sub("Sign-in uses one-time phone codes, with lockout after repeated wrong tries.", "Sign-in uses one-time email codes, with lockout after repeated wrong tries.")
sub("<li>Sessions end after 15 minutes of inactivity.</li>", "<li>You can sign out of this device at any time from Privacy &amp; Security.</li>")
sub("You’re signed out after 15 minutes of inactivity.", "Sign out from Privacy & Security when you use a shared phone.")
sub("signs out after 15 minutes of inactivity", "stays signed in until you sign out")
resub(r"\nsetInterval\(\(\)=>\{if\(S\.user&&Date\.now\(\)-lastAct>15\*60\*1000\)[^\n]*", '')

# refresh pill: shown by the real "new stock" check (live layer), and it really reloads the catalogue
resub(r"\nsetInterval\(\(\)=>\{const f=\$\('#fresh'\);if\(f\.classList\.contains\('show'\)\)return;\n[^\n]*", '')
sub("function doRefresh(){hideFresh();lastFresh=Date.now();loading('Refreshing the store','Getting the latest stock and prices',1100).then(()=>{",
    "function doRefresh(){hideFresh();lastFresh=Date.now();loading('Refreshing the store','Getting the latest stock and prices',300).then(()=>loadCatalog().catch(()=>{})).then(()=>{")

# the map shows an estimate: delivery partners don't share live GPS
sub("<span class=\"live\">Live ${inter?'courier':'rider'} location</span>", "<span class=\"live\">Estimated ${inter?'courier':'rider'} position</span>")
sub("${inter?'Updated by the courier':'Updates every few seconds'}", "${inter?'Estimate from courier times':'Estimate · your rider calls before arriving'}")

sub("/* new-stock check: in the live site this asks the server whether the admin changed products or prices.\n   Prototype: offers a refresh after the shopper has been browsing for about 90 seconds. */", "/* new-stock pill: shown by checkFresh() in the live layer when the admin changes products or prices */")

# old simulated hand-over (the live layer has the real one)
resub(r"/\* hand-over to a person: the admin desk gets notified.*?\n(?=function disarmIdle)", '')
resub(r"function armIdle\(\)\{disarmIdle\(\);if\(CH\.mode!=='agent'\)return;\n.*?\n(?=/\* ---------- combo swaps)", '')

# old simulated payment, sample inbox and pretend order progress
resub(r"\nif\(!S\.inbox\)S\.inbox=\[\n.*?\n\];", '')
resub(r"\n  if\(a==='simulate'\)[^\n]*", '')
resub(r"function createPay\(\)\{const f=deliveryFee.*?\n(?=/\* ---------- automatic order emails)", '')
resub(r"/\* prototype pace: packed.*?\n\}\n(?=function selectAcct)", '')

sub('<p class="demo">A copy of this chat is in your Inbox.</p>', '<p class="demo">Need more help? Start a new chat any time.</p>')

sub("const code=(n.body.match(/TD-\\d{5}/)||[])[0]", "const code=(n.body.match(/TD-\\d{5,9}/)||[])[0]")

# products with no reviews yet say "New" instead of 0.0 (0)
sub('<span class="pc-rt num"><span class="stars">★</span>${rt.avg.toFixed(1)} <i>(${rt.n})</i></span>', '${rt.n?`<span class="pc-rt num"><span class="stars">★</span>${rt.avg.toFixed(1)} <i>(${rt.n})</i></span>`:`<span class="pc-rt num"><i>New</i></span>`}')
sub("<span class=\"stars\">★</span> ${rt.avg.toFixed(1)} (${rt.n})</div>", "${rt.n?`<span class=\"stars\">★</span> ${rt.avg.toFixed(1)} (${rt.n})`:'New'}</div>")
sub("${rt.avg.toFixed(1)} / 5 from ${rt.n} reviews", "${rt.n?rt.avg.toFixed(1)+' / 5 from '+rt.n+' review'+(rt.n>1?'s':''):'No reviews yet'}")

# ---------- plug in the live layer ----------
sub("render();netState();\nsetTimeout(hideLoader,900);\n})();", live.rstrip() + "\n})();")

for bad in ['__ICON__', '__FULL__', '__PHOTO', 'Prototype', 'Ruka', 'TD-84902']:
    if bad in s:
        i = s.index(bad)
        sys.exit(f'make_shop: leftover "{bad}" near: {s[max(0,i-80):i+80]!r}')

s = s.rstrip() + '\n</html>\n' if '</html>' not in s else s
out = here.parent / 'public' / 'shop.html'
out.write_text(s)
(here / 'check_shop.js').write_text(re.search(r'<script>(.*)</script>', s, re.S).group(1))
print('built', out, len(s) // 1024, 'KB')
