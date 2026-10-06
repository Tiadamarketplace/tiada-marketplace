"""Builds public/admin.html from the desk design (admin_src.html) plus the live layer (live_admin.js).
Run:  python3 frontend/make_admin.py   (every replacement must match, so design changes fail loudly)"""
import pathlib, re, sys

here = pathlib.Path(__file__).parent
s = (here / 'admin_src.html').read_text()
live = (here / 'live_admin.js').read_text()

def sub(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f'make_admin: expected {count}, found {n}:\n  {old[:140]}')
    s = s.replace(old, new)

def resub(pat, new, count=1):
    global s
    s, n = re.subn(pat, new, s, flags=re.S)
    if n != count:
        sys.exit(f'make_admin: regex expected {count}, found {n}: {pat[:100]}')

sub('<meta charset="utf-8">\n', '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0B3A23">
<link rel="icon" type="image/png" href="/icon-sm.png">
''')
sub('data:image/png;base64,__ICON__', '/icon-sm.png')
resub(r'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>__PHOTODEFS__</defs></svg>\n', '')
sub('const PHOTOS=new Set(__PHOTOKEYS__);', 'const PHOTOS=new Set();')

# start empty: everything comes from the server, nothing is kept in the browser
resub(r"const P0=\[.*?\n(?=/\* ---------- state)", '')
sub("auth:store.get('auth',null)", "auth:null")
sub("products:store.get('products',[...P0,...COMBOS0]),", "products:[],")
for k in ['orders', 'promos', 'chats', 'reviews']:
    sub(f"{k}:store.get('{k}',null),", f"{k}:[],")
sub("log:store.get('log',[]),", "log:[],")
resub(r"fees:store\.get\('fees',\{[^\n]*\}\),\n", "fees:{min:0,lagosKg:0,interKg:0,van:0,same:0,express:0,areas:[],regions:[]},\n")
sub("sent:store.get('sent',[]),", "sent:[],")
sub("layout:store.get('layout',[", "layout:([")
sub("tiles:store.get('tiles',", "tiles:(")
sub("aisles:store.get('aisles',", "aisles:(")
resub(r"const save=\(\)=>\{\[[^\n]*\n", "const save=()=>{};\n")
resub(r"/\* sample orders \(fictional customers\) \*/.*?\n(?=/\* ---------- helpers)", '')

# order lines carry the price and name they were bought at
sub("const byId=id=>S.products.find(p=>p.id===id);",
    "const byId=id=>S.products.find(p=>p.id===id)||(id?{id,name:GONE[id]||'Removed item',cat:'',sizes:[{label:'',price:0,sale:null,kg:0}],stock:0,low:0,status:'na',gone:true}:undefined);")
sub("const itemTotal=it=>{const p=byId(it[0]);", "const itemTotal=it=>{if(it[4]!=null)return it[4]*it[2];const p=byId(it[0]);")
sub("${esc(p.name)}</b> <span class=\"num\">× ${it[2]}</span>", "${esc(it[5]||p.name)}</b> <span class=\"num\">× ${it[2]}</span>")

# dashboard numbers come from real orders
sub("  SALES[6]=today.reduce((a,o)=>a+o.total,0)||118700;\n", "")
sub("const top=[['milo',38],['cc6',27],['fc1',24],['goldenmorn',21],['cornflakes',17]];", "const top=topSellers();")
sub("const mx=Math.max(...SALES);", "const mx=Math.max(50000,...SALES);")
sub("${today.length||3} orders paid", "${today.length} order${today.length===1?'':'s'} paid")
sub('<div class="card pad"><h3>Best sellers this week</h3><div class="list">${top.map(',
    '<div class="card pad"><h3>Best sellers this week</h3><div class="list">${top.length?"":"<p class=\\"hint\\" style=\\"margin:0\\">Sales will show here.</p>"}${top.map(')
sub("${S.orders.slice(0,5).map(o=>", "${S.orders.length?'':'<p class=\"hint\" style=\"margin:0\">New paid orders appear here automatically.</p>'}${S.orders.slice(0,5).map(o=>")

# words that only made sense in the prototype
sub("<span>From</span><b>${esc(o.bank)}</b>", "")
sub("<b>Refunded to:</b> the ${esc(o.bank)} account you paid from", "<b>Refunded to:</b> the bank account you paid from")
sub("to the ${esc(o.bank)} account you paid from. It usually shows within 24 hours.", "to the bank account you paid from. It usually shows within 1–3 working days.")
sub("The refund goes back through Paystack to the ${esc(o.bank)} account the customer paid from.", "The refund goes back through Paystack to the bank account the customer paid from.")
resub(r'<p class="hint" style="margin:10px 0 0">On the live site, Kwik and GIG can send[^<]*</p>', '<p class="hint" style="margin:10px 0 0">When the partner confirms the drop-off, come back and tap “Mark as delivered”.</p>')
sub("let bc={subj:'',body:'',aud:'all',confirm:false};", "let bc={subj:'',body:'',aud:'promo',confirm:false};")
sub("${c.order?' · '+c.order:''} · ${c.id}</span>", "${c.order?' · '+c.order:''}</span>")
sub("setTimeout(incomingOrder,25000);setTimeout(incomingOrder,95000);", "")
resub(r"\nconst NEWBIES=\[.*?\nlet nb=0;\nfunction incomingOrder\(\)\{.*?\n\}\n", "\n")
resub(r"\nfunction vLogin\(\)\{.*?\n\}\n", "\n")
resub(r"\nfunction vSecurity\(\)\{.*?\n\}\n", "\n")
resub(r"\n  if\(a==='fillpw'\)[^\n]*\n  if\(a==='fillcode'\)[^\n]*", "")
resub(r"\n  if\(f\.id==='f-login'\).*?\n(?=  if\(f\.id==='f-deliv'\))", "\n")
resub(r"setInterval\(\(\)=>\{if\(S\.auth&&Date\.now\(\)-lastAct>15\*60000\)\{[^\n]*",
      "setInterval(()=>{if(S.auth&&Date.now()-lastAct>15*60000){api('/api/admin/logout?idle=1',{body:{}}).catch(()=>{});S.auth=null;login={step:'pw',email:'',err:'',ticket:''};closeModal();render();toast('Locked after 15 minutes of inactivity')}},30000);")
sub("const QUICK=['Hi! I’m Ruka from Tiada. How can I help?',", "const QUICK=['Hi! I’m from Tiada. How can I help?',")

# plug in the live layer
sub("\nrender();\n})();\n</script>", "\n" + live.rstrip() + "\n})();\n</script>")

for bad in ['__ICON__', '__PHOTO', 'Prototype', 'prototype', 'Ruka', 'ruka', '246810', 'example.com']:
    if bad in s:
        i = s.index(bad)
        sys.exit(f'make_admin: leftover "{bad}" near: {s[max(0,i-100):i+80]!r}')
if '</html>' not in s:
    s = s.rstrip() + '\n</html>\n'
out = here.parent / 'public' / 'admin.html'
out.write_text(s)
(here / 'check_admin.js').write_text(re.search(r'<script>(.*)</script>', s, re.S).group(1))
print('built', out, len(s) // 1024, 'KB')
