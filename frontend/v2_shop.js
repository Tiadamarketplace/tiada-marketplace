/* ===================== 2026 redesign layer (matches the Figma file) =====================
   Loaded after the live layer. Function declarations here replace the older ones. */

Object.assign(ICON,{copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',phone:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',check:'<path d="M20 6 9 17l-5-5"/>'});

/* ---------- header (desktop + phone) and the bottom tab bar ---------- */
function renderNav(){
  const r=S.route==='checkout'||S.route==='pay'||S.route==='success'?'cart':S.route==='privacy'||S.route==='guide'?'account':S.route==='search'||S.route==='land'||S.route==='seeall'?(S.land&&String(S.land).startsWith('cat:ccombo')?'combos':S.land==='deals'?'deals':'catalog'):S.route==='home'?'home':S.route;
  const n=cartCount(),first=S.user?esc(S.user.name.split(' ')[0]):'',un=S.user?unread():0;
  const link=(attr,label,key)=>`<button ${attr} class="dn-l ${r===key?'on':''}">${label}</button>`;
  $('#dnav').innerHTML=
    link('data-go="catalog"','Shop','catalog')+link('data-land="cat:ccombo"','Combos','combos')+link('data-land="deals"','Deals','deals')+link('data-go="track"','Track order','track')+
    `<span class="dn-gap"></span>`+
    `<button class="dn-ic" data-go="wishlist" aria-label="Wishlist, ${S.wish.length} saved" data-tip="Wishlist">${ic('heart',19)}${S.wish.length?`<span class="bubble num">${S.wish.length}</span>`:''}</button>`+
    (S.user?`<button class="dn-ic" data-inbox="1" aria-label="Inbox, ${un} unread" data-tip="Inbox${un?` · ${un} new`:''}">${ic('bell',19)}${un?`<span class="bubble num">${un}</span>`:''}</button>`:'')+
    `<button class="dn-acc ${r==='account'?'on':''}" data-go="account">${ic('user',17)}<span>${S.user?first:'Sign in'}</span></button>`+
    `<button class="dn-bag" data-go="cart" aria-label="Basket, ${n} items" data-tip="${n?`View basket · ${naira(subtotal())}`:'Your basket is empty'}">${ic('bag',17)}<span>Basket</span><i class="num">${n}</i></button>`;
  const mb=$('#m-bag');if(mb)mb.innerHTML=`${ic('bag',16)}<i class="num">${n}</i>`;
  const bell=$('#m-bell');if(bell)bell.innerHTML='';
  $('#tabs').innerHTML=NAV.map(t=>{const on=r===t[0],b=t[0]==='cart'?n:t[0]==='account'&&S.user?un:0;
    return `<button data-go="${t[0]}" class="${on?'on':''}" aria-label="${t[1]}${b?`, ${b}`:''}"><span class="tb-i">${ic(t[2],22)}${b?`<span class="bubble num">${b}</span>`:''}</span><span class="tb-l">${t[1]}</span></button>`}).join('');
}

/* ---------- product card ---------- */
function card(p){
  const size=sizeOf(p),pr=priceOf(p,size),wished=S.wish.includes(p.id),out=p.status==='out',rt=ratingFor(p.id);
  const off=pr.was?Math.round((1-pr.now/pr.was)*100):0;
  const nSizes=p.sizes.filter(x=>!x.na).length;
  const sub=p.items?`${p.items.length} items · ${p.items.slice(0,3).join(', ')}`:nSizes>1?`${size==='1 paint'?'1 paint':size} · ${nSizes} sizes`:size;
  const tag=off?`<span class="pc-tag off">-${off}%</span>`:p.status==='fast'?'<span class="pc-tag">Fast selling</span>':p.items?'<span class="pc-tag">Combo</span>':'';
  return `<article class="pc">
    <div class="pc-media">
      <button class="pc-img" data-open="${p.id}" aria-label="View ${esc(p.name)}" data-tip="View sizes, details &amp; reviews">${art(p)}${out?'<div class="mask"><span>SOLD OUT</span></div>':''}</button>
      ${tag}
      <button class="heart ${wished?'on':''}" data-wish="${p.id}" aria-label="${wished?'Remove from':'Save to'} wishlist" data-tip="${wished?'Remove from wishlist':'Save to wishlist'}">${ic('heart',15,wished)}</button>
    </div>
    <div class="pc-b">
      <h4>${esc(p.name)}</h4>
      <span class="pc-sub">${esc(sub)}</span>
      ${rt.n?`<span class="pc-rt num"><span class="stars">★</span>${rt.avg.toFixed(1)} <i>(${rt.n})</i></span>`:''}
      <div class="pc-foot">
        <div class="pc-prices"><b class="pc-now num">${naira(pr.now)}</b>${pr.was?`<s class="pc-was num">${naira(pr.was)}</s>`:''}</div>
        ${out?'<span class="pc-out">Sold out</span>':`<button class="pc-add" data-add="${p.id}" aria-label="Add ${esc(p.name)} ${size!=='Package'?size:''} to basket" data-tip="Add ${size!=='Package'?(size==='1 paint'?'1 paint bucket':size):'package'} to basket">+</button>`}
      </div>
      ${p.stock<5&&!out?`<div class="pc-stock" aria-hidden="true"><i style="width:${p.stock*12}%"></i></div><span class="pc-left">Only ${p.stock} left</span>`:''}
    </div>
  </article>`;
}

/* ---------- account: on wide screens the menu stays on the left ---------- */
const ACC_WIDE=()=>innerWidth>=1000;
function accOverview(){
  const live=S.orders.find(o=>['paid','packed','route','issue'].includes(o.status));
  const vc=S.vouchers.filter(v=>!v.used).length,un=unread();
  const tile=(v,icon,t,d)=>`<button class="ov-tile" data-accv="${v}"><span class="ov-i">${ic(icon,18)}</span><b>${t}</b><small>${d}</small></button>`;
  return `<h1 class="page">Overview</h1>
   ${live?`<div class="ov-live"><span class="ov-li">${ic('box',24)}</span><span class="ov-lt"><b>${live.id} is ${esc(STATUS[live.status]?STATUS[live.status][0].toLowerCase():'on its way')}</b><small>${live.items.length} item${live.items.length>1?'s':''} · ${naira(live.total)}</small></span><button class="btn" data-track="${live.id}">Track order</button></div>`:''}
   <div class="ov-grid">${tile('inbox','mail',un?`${un} new message${un>1?'s':''}`:'Inbox','Order updates and receipts')}${tile('orders','box',`${S.orders.length} order${S.orders.length===1?'':'s'}`,'Track, rate and buy again')}${tile('vouchers','ticket',vc?`${vc} voucher${vc>1?'s':''}`:'Vouchers','Discounts you can use')}</div>
   <div class="ov-quick"><button class="btn" data-act="chat">${ic('chat',18)} Live chat</button><a class="btn gold" href="https://wa.me/2348075110000" target="_blank" rel="noopener">${ic('chat',18)} WhatsApp</a></div>`;
}
function vAccount(){
  if(!S.user||!ACC_WIDE())return vAccountBase();
  const keep=S.accView;S.accView='menu';let menu=vAccountBase();S.accView=keep;
  const main=keep==='menu'?accOverview():vAccountBase();
  const act=keep==='msg'?'inbox':keep;
  menu=menu.replace(new RegExp(`class="mrow" data-accv="${act}"`),`class="mrow on" data-accv="${act}"`);
  return `<div class="acc2"><aside class="acc2-side">${menu}</aside><section class="acc2-main">${main}</section></div>`;
}
let accWideWas=ACC_WIDE();
addEventListener('resize',()=>{const w=ACC_WIDE();if(w!==accWideWas){accWideWas=w;if(S.route==='account')render()}});

/* ---------- pay by transfer ---------- */
function vPay(){
  const p=S.pay;if(!p)return vCart();const a=p.acct||{};
  const step=(i,icon,t,d)=>`<div class="pay-step"><span class="ps-i">${ic(icon,18)}</span><span><b>${i}. ${t}</b><small>${d}</small></span></div>`;
  return `<div class="pay2">
   <div class="pay2-main">
    <h1 class="page">Almost done${S.user?', '+esc(S.user.name.split(' ')[0]):''}</h1>
    <p class="sub">Transfer from any bank app. This account was made just for order ${esc(p.id)} and expires in 30 minutes.</p>
    <div class="va2">
     <div class="va2-top">
      <span class="va2-amt"><small>Transfer exactly</small><b class="num">${naira(p.total)}</b><em>Order ${esc(p.id)} · one-time account</em></span>
      <span class="va2-ring" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="tr"/><circle cx="60" cy="60" r="52" class="ar" id="va-arc"/></svg><span><b class="num" id="va-clock">--:--</b><small>left</small></span></span>
     </div>
     <div class="va2-rows">
      <div class="va2-row"><span><small>Bank</small><b>${esc(a.bank||'Bank')}</b></span></div>
      <div class="va2-row"><span><small>Account number</small><b class="num big" id="acct">${esc(a.number||'')}</b></span><button class="copy strong" data-copy="${esc(a.number||'')}" data-tip="Copy account number">${ic('copy',14)} Copy number</button></div>
      <div class="va2-row"><span><small>Account name</small><b>${esc(a.name||'Tiada Marketplace')}</b></span></div>
      <div class="va2-row"><span><small>Amount</small><b class="num">${naira(p.total)}</b></span><button class="copy" data-copy="${p.total}" data-tip="Copy exact amount">${ic('copy',14)} Copy</button></div>
     </div>
     <div class="va2-wait"><span class="dots"><i></i><i></i><i></i></span>Waiting for your transfer. This page updates by itself the moment it lands — no receipt to upload.</div>
    </div>
    <div class="pay2-btns"><button class="btn" data-act="paid-check">I’ve sent it — check now</button><button class="btn ghost" data-act="cancelpay">Back to basket</button></div>
    <p class="demo" id="pay-msg">Tap after sending the transfer. We’ll confirm it with the bank.</p>
   </div>
   <aside class="pay2-side panel">
    <h3>How to pay</h3>
    ${step(1,'phone','Open your bank app','Any Nigerian bank works — GTBank, Opay, Kuda, Access and more.')}
    ${step(2,'card','Transfer the exact amount','To the account on this page. Check the account name in your bank app matches before you send.')}
    ${step(3,'check','We confirm it automatically','You’ll see “Payment received” here and in your email.')}
    <div class="note-row warn">${ic('alert',16)}<span>If your bank shows a different account name, stop and message us on WhatsApp ${esc(STORE.whatsapp||'08075110000')}.</span></div>
    <div class="note-row safe">${ic('shield',16)}<span>Tiada will never ask for your PIN, OTP or password.</span></div>
   </aside></div>`;
}
/* countdown ring follows the clock text */
setInterval(()=>{const arc=document.getElementById('va-arc');if(!arc||!S.pay||!S.pay.expires)return;const left=Math.max(0,S.pay.expires-Date.now());const f=Math.min(1,left/(30*60000));arc.style.strokeDashoffset=String(326.7*(1-f))},1000);

/* ---------- real Google map on the tracking page ----------
   Directions from the Ojota hub to the delivery AREA only (never the street address).
   Google sets its own cookies, so it loads by itself only after "Accept all"; otherwise one tap loads it. */
const HUB_Q='Ojota Bus Stop, Ikorodu Road, Lagos, Nigeria';
const gDest=z=>z.state?`${z.city}, ${z.state==='FCT Abuja'?'FCT':z.state+' State'}, Nigeria`:`${z.label.split(',')[0].trim()}, Lagos, Nigeria`;
function gmapSrc(z){const e=encodeURIComponent,k=STORE.mapsKey;
  return k?`https://www.google.com/maps/embed/v1/directions?key=${e(k)}&origin=${e(HUB_Q)}&destination=${e(gDest(z))}&mode=driving`
    :`https://maps.google.com/maps?saddr=${e(HUB_Q)}&daddr=${e(gDest(z))}&output=embed`}
const gmapLink=z=>`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(HUB_Q)}&destination=${encodeURIComponent(gDest(z))}&travelmode=driving`;
let GMAP_OK=false;
function mapHTML(o){
  const z=zoneById(o.zone)||ZONES[4],on=S.consent==='all'||GMAP_OK,dest=z.state?z.city:zoneShort(z);
  let h=mapHTMLBase(o);
  const g=on?`<div class="gmap"><iframe src="${gmapSrc(z)}" title="Google map: route from our Ojota hub to ${esc(dest)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>`
    :'';
  h=h.replace('<div class="tmap" ',`<div class="tmap${on?' g-on':''}" `).replace('<div class="eta">',g+'<div class="eta">');
  return h.replace(/<\/div>\s*$/,`<div class="gmap-foot">${on?'':`<button class="gmap-on" data-act="gmap-on">${ic('pin',16)} Show Google map here</button>`}<a href="${gmapLink(z)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>${on?'':'<span class="hint" style="flex-basis:100%">The Google map may set its own cookies.</span>'}</div></div>`);
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-act="gmap-on"]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();GMAP_OK=true;render()},true);
