"""Builds public/shop.html from the screen design (shop_src.html) plus the live layer (live_shop.js).
Run:  python3 frontend/make_shop.py
Every replacement must match exactly once, so a design change that breaks the merge fails loudly."""
import pathlib, re, sys

here = pathlib.Path(__file__).parent
s = (here / 'shop_src.html').read_text()
live = (here / 'live_shop.js').read_text()
live = live + '\n' + (here / 'native_loading.js').read_text()

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
<style>body:has(.scrim) .consent{display:none}
#topbar{display:none!important}
.pc,.wrow{cursor:pointer}.pc:active{transform:scale(.985)}
.au2{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);max-width:940px;margin:8px auto 24px;background:var(--card);border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:0 2px 6px rgba(11,58,35,.06),0 24px 60px rgba(11,58,35,.10)}
.au2-side{position:relative;overflow:hidden;background:linear-gradient(150deg,#0B3A23 0%,#14532F 70%,#1d6a3e 100%);color:#fff;padding:36px 32px;display:flex;flex-direction:column;gap:14px}
.au2-side::after{content:"";position:absolute;right:-110px;bottom:-110px;width:300px;height:300px;border-radius:50%;border:2px solid rgba(212,155,65,.35)}
.au2-side::before{content:"";position:absolute;right:-60px;bottom:-60px;width:200px;height:200px;border-radius:50%;border:2px solid rgba(212,155,65,.2)}
.au2-logo{width:52px;height:auto;background:#FBF9F4;border-radius:14px;padding:6px}
.au2-side h2{margin:6px 0 0;font-size:28px;line-height:1.12;letter-spacing:-.01em}
.au2-side p{margin:0;color:#CFE0D5;font-size:14px}
.au2-side ul{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:14px;position:relative;z-index:1}
.au2-side li{display:flex;gap:12px;align-items:flex-start}
.au2-side li>span{flex:none;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:rgba(255,255,255,.1);color:#F3C77E}
.au2-side li b{display:block;font-size:14px}.au2-side li small{color:#B9D0C1;font-size:12.5px}
.au2-main{padding:32px 34px;display:flex;flex-direction:column}
.au2-tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--cream);border:1px solid var(--line);border-radius:999px;padding:4px;margin-bottom:22px}
.au2-tabs button{height:40px;border:0;border-radius:999px;background:transparent;font:inherit;font-weight:700;color:var(--muted);cursor:pointer;transition:background .2s,color .2s,box-shadow .2s}
.au2-tabs button.on{background:var(--green);color:#fff;box-shadow:0 4px 12px rgba(11,58,35,.25)}
.au2-h{margin:0;font-size:26px;color:var(--green);letter-spacing:-.01em}
.au2-sub{margin:6px 0 18px;color:var(--muted);font-size:14px}
.au2-main .btn{width:100%;height:50px;font-size:15px;margin-top:4px}
.au2-code{height:60px!important;font-size:28px!important;font-weight:800!important;letter-spacing:.55em!important;text-align:center}
.au2-c{text-align:center;margin:10px 0 0}
.au2-switch{text-align:center;margin:16px 0 0;font-size:14px;color:var(--muted)}
.au2-help{margin:14px 0 0;border:1px solid var(--line);border-radius:12px;background:var(--card,#fff)}
.au2-help summary{cursor:pointer;list-style:none;padding:12px 14px;font-weight:700;font-size:14px;color:var(--green,#0B3A23);display:flex;align-items:center;gap:8px}
.au2-help summary::-webkit-details-marker{display:none}
.au2-help summary::after{content:'+';margin-left:auto;font-weight:800;color:var(--muted)}
.au2-help[open] summary::after{content:'–'}
.au2-help ol{margin:0;padding:0 16px 4px 34px;font-size:13.5px;line-height:1.55;color:var(--ink,#26332B)}
.au2-help ol li{margin:0 0 8px}
.au2-help .au2-hbtns{display:flex;flex-wrap:wrap;gap:8px;padding:4px 14px 14px}
.au2-help .au2-hbtns .btn{flex:1;min-width:140px;height:40px;font-size:13px}
.au2-back{align-self:flex-start;display:inline-flex;align-items:center;gap:4px;border:0;background:none;color:var(--green);font:inherit;font-weight:700;font-size:13px;padding:0 0 12px;cursor:pointer}
@media (max-width:760px){.au2{grid-template-columns:minmax(0,1fr);border-radius:20px;margin-top:0}
 .au2-side{padding:22px 20px;flex-direction:row;flex-wrap:wrap;align-items:center;gap:10px 14px}
 .au2-side h2{font-size:20px;margin:0}.au2-side h2 br{display:none}.au2-side p{flex-basis:100%}.au2-side ul{display:none}
 .au2-main{padding:22px 18px}}
</style>
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
    "function doRefresh(){hideFresh();lastFresh=Date.now();busy('Refreshing the store','Getting the latest stock and prices',()=>loadCatalog().catch(()=>{})).then(()=>{")

# the map shows an estimate: delivery partners don't share live GPS
sub("<span class=\"live\">Live ${inter?'courier':'rider'} location</span>", "<span class=\"live\">Route to you</span>")
sub("${inter?'Updated by the courier':'Updates every few seconds'}", "Estimate only · depends on traffic and the delivery partner")

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

# account: "My details" page, default address, checkout fills itself from the account
sub("addresses:accAddr,privacy:accPrivacy,help:accHelp}[S.accView]();", "addresses:accAddr,privacy:accPrivacy,help:accHelp,profile:accProfile}[S.accView]();")
sub("addresses:'Address Book',privacy:'Privacy & Security',help:'Help & Support'};", "addresses:'Address Book',privacy:'Privacy & Security',help:'Help & Support',profile:'My details'};")
sub("    ${row('addresses','pin','Address Book',`<span class=\"mcount\">${S.addresses.length||''}</span>`)}", "    ${row('profile','user','My details',!S.user.phone||!S.addresses.length?'<span class=\"mnew\">Complete</span>':'')}\n    ${row('addresses','pin','Address Book',`<span class=\"mcount\">${S.addresses.length||''}</span>`)}")
sub("if(S.user&&!S.co.phone)S.co.phone=S.user.phone;", "if(S.user&&!S.co.phone)S.co.phone=S.user.phone;if(S.user&&!S.co.addr&&!S.co.addrId&&S.addresses.length){const a=S.addresses[0];S.co.addrId=a.id;S.co.addr=a.street;S.co.landmark=a.landmark||'';S.co.zone=a.zone}")

# bottom tab bar docked to the bottom edge again (no longer floating)
sub("@media (prefers-reduced-motion:reduce){.tabs.mini{left:12px!important;right:12px;height:64px!important}.tabs.mini button{font-size:10.5px}}",
"""@media (prefers-reduced-motion:reduce){.tabs.mini{left:12px!important;right:12px;height:64px!important}.tabs.mini button{font-size:10.5px}}
/* docked tab bar: sits on the bottom edge, full width; still glass, still shrinks a little while scrolling */
@media (max-width:760px){
  .tabs,.tabs.mini{left:0!important;right:0!important;width:100%!important;bottom:0!important;border-radius:20px 20px 0 0!important;
    border:0!important;border-top:1px solid rgba(255,255,255,.85)!important;
    height:calc(64px + env(safe-area-inset-bottom,0px))!important;padding-bottom:env(safe-area-inset-bottom,0px)!important;
    background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(251,249,244,.78))!important;
    box-shadow:0 -6px 22px rgba(11,58,35,.10),inset 0 1px 0 rgba(255,255,255,.9)!important}
  .tabs.mini{height:calc(52px + env(safe-area-inset-bottom,0px))!important}
  .tabs.mini button{font-size:0;gap:0}
  .tabs{transition:height .3s cubic-bezier(.3,.8,.3,1)!important}
  main{padding-block:14px 92px}
  footer{padding-bottom:76px}
  .toast{bottom:84px}
  .consent{bottom:80px}
}""")

# Halo loading screen (chosen by the owner)
sub('<header class="hdr">', '<style>/* Halo loader: no card, logo floats on frosted glass with a gold arc circling it */\n.loader{background:rgba(251,249,244,.55)!important;-webkit-backdrop-filter:blur(14px) saturate(1.3)!important;backdrop-filter:blur(14px) saturate(1.3)!important}\n.ld-card{background:none!important;border:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;padding:0!important;gap:3px!important;animation:haloIn .3s ease-out}\n.ld-mark{width:104px!important;height:104px!important;margin-bottom:12px!important}\n.ld-mark img{width:52px!important;filter:drop-shadow(0 6px 14px rgba(11,58,35,.25));animation:haloBreathe 1.6s ease-in-out infinite!important}\n.ld-mark::before{border:0!important;background:conic-gradient(from 0deg,transparent 0 62%,#D49B41 92%,transparent 100%);-webkit-mask:radial-gradient(circle,transparent 48px,#000 49px);mask:radial-gradient(circle,transparent 48px,#000 49px);animation:haloSpin 1s linear infinite!important}\n.ld-card b{font-size:15.5px!important;color:#0B3A23!important;font-weight:700}\n.ld-card small{color:#4F6357!important}\n.loader.out .ld-card{transform:scale(.96)}\n@keyframes haloSpin{to{transform:rotate(360deg)}}\n@keyframes haloBreathe{50%{transform:scale(1.07)}}\n@keyframes haloIn{from{opacity:0;transform:translateY(6px) scale(.96)}}\n@media (prefers-reduced-motion:reduce){.loader *{animation-duration:.01ms!important;animation-iteration-count:1!important}}\n</style>\n<header class="hdr">', 1)

# real page loads: every page has its own address, so the browser's own loading shows on each change
sub("function goNow(r){", "function goNowBase(r){")
# page-to-page: the new page shows the same loading message straight away (no second overlay popping in)
sub('<small id="ld-sub">Getting today’s prices</small></div></div>\n', '<small id="ld-sub">Getting today’s prices</small></div></div>\n<script>(function(){try{var n=JSON.parse(sessionStorage.getItem("tiada_nav")||"null");if(n&&Date.now()-n.t<20000){var L=document.getElementById("loader");L.classList.add("cont");document.getElementById("ld-msg").textContent=n.m||"Loading";document.getElementById("ld-sub").textContent=n.s||""}}catch(e){}})()</script>\n<style>.loader.cont,.loader.cont .ld-card,.loader.cont .ld-mark{animation-name:none!important}.loader.cont .ld-mark::before{animation-name:haloSpin!important}.loader.cont .ld-mark img{animation-name:haloBreathe!important}</style>\n')
sub("function botAnswer(raw){", "function botAnswerBase(raw){")
# no fixed waits: page changes start loading at once, in-page views only show the overlay briefly
sub("function go(r){if(r===S.route", "function goBase(r){if(r===S.route")
sub("function withLoad(kind,fn,ms,label,sub){", "function withLoadBase(kind,fn,ms,label,sub){")
sub("function loading(msg,sub,ms){", "function loadingBase(msg,sub,ms){")
sub("const QUICK=['Delivery fees','Combo prices','Track my order','How do I pay?','Refunds','Talk to a person'];",
    "const QUICK=['Track my order','My basket','Delivery fees','How long is delivery?','Combo prices','Popular items','How do I pay?','Can’t sign in','Refunds','Talk to a person'];")
sub(".cbtns button{", ".cbtns a{border:1px solid var(--green);background:#fff;color:var(--green);border-radius:999px;padding:6px 10px;font-weight:700;font-size:12px;text-decoration:none}\n.cbtns button{")
sub("withLoad(v==='menu'?'menu':'list',()=>{S.accView=v;S.showData=false;render()}", "withLoad(v==='menu'?'menu':'list',()=>{S.accView=v;S.showData=false;goNow('account')}")

# ---------- plug in the live layer ----------
sub("render();netState();\nsetTimeout(hideLoader,900);\n})();", live.rstrip() + "\n})();")

for bad in ['__ICON__', '__FULL__', '__PHOTO', 'Prototype', 'Ruka', 'TD-84902']:
    if bad in s:
        i = s.index(bad)
        sys.exit(f'make_shop: leftover "{bad}" near: {s[max(0,i-80):i+80]!r}')

s = s.rstrip() + '\n</html>\n' if '</html>' not in s else s
out = here.parent / 'public' / 'shop.html'
out.write_text(s)
(here / 'check_shop.js').write_text(max(re.findall(r'<script>(.*?)</script>', s, re.S), key=len))
print('built', out, len(s) // 1024, 'KB')
