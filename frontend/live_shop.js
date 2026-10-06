/* ================= LIVE LAYER: connects the shop to the real server =================
   Everything above this point is the screen design. This part loads real products,
   real accounts, real orders and real payments from /api. */
const api=async(path,opts={})=>{
  const r=await fetch(path,{method:opts.method||(opts.body?'POST':'GET'),headers:opts.body?{'Content-Type':'application/json'}:{},body:opts.body?JSON.stringify(opts.body):undefined,credentials:'same-origin'});
  let j={};try{j=await r.json()}catch(_){}
  if(!r.ok)throw Object.assign(new Error(j.error||'Something went wrong. Please try again.'),{status:r.status});
  return j;
};
const errMsg=e=>(e&&e.message)||'Something went wrong. Please try again.';
let FEES={min:10000,lagosKg:50,interKg:400,van:3000,same:2500,express:3500,eco:1000},LAYOUT=[],TILES={},AISLES={},STORE={whatsapp:'08075110000'};
const SHAPES={milk:['bottle','#2E6FB5'],cereal:['box','#C8462C'],grain:['pouch','#C9B48A'],ccombo:['basket','#D49B41'],fcombo:['sack','#C9A46C']};
const CUSTOM_SHAPE={milo:['tin','#2F7D3A'],chocomalt:['tin','#6B3E22'],custard:['tin','#E2B829'],frosties:['box','#2B6CB0'],cocopops:['box','#7A4A2A'],moonstar:['box','#24356B'],fruitfiber:['box','#B5651D'],goldenmorn:['box','#E3A01E'],granola:['pouch','#8A5A2B']};

function applyCatalog(d){
  const toClient=p=>{
    const sale={};p.sizes.forEach(s=>{if(s.sale&&s.price&&s.sale<s.price)sale[s.label]=s.sale});
    const sh=CUSTOM_SHAPE[p.id]||SHAPES[p.cat]||['box','#C8462C'];
    const c={id:p.id,name:p.name,cat:p.cat,sizes:p.sizes.map(s=>({label:s.label,price:s.price,kg:s.kg,na:!!s.na||s.price==null})),status:p.status,stock:p.stock,img:p.img,short:p.short||p.name.toUpperCase(),shape:sh[0],c1:sh[1],rating:p.rating};
    if(Object.keys(sale).length)c.sale=sale;
    if(p.items){c.items=p.items;c.price=p.sizes[0].price}
    return c;
  };
  const prods=d.products.map(toClient);
  P.length=0;CEREAL_COMBOS.length=0;FOOD_COMBOS.length=0;ALL.length=0;
  prods.forEach(p=>{if(p.cat==='ccombo')CEREAL_COMBOS.push(p);else if(p.cat==='fcombo')FOOD_COMBOS.push(p);else P.push(p)});
  CEREAL_COMBOS.forEach((c,i)=>c.n=i+1);
  FOOD_COMBOS.forEach(c=>c.n=c.id==='fcE'?'E':(c.id.replace(/\D/g,'')||'•'));
  ALL.push(...P,...CEREAL_COMBOS,...FOOD_COMBOS);
  ZONES.length=0;d.zones.forEach(z=>ZONES.push({id:z.id,label:z.label,km:z.km,fee:z.fee,day:z.day,state:z.state,city:z.city,region:z.region,days:z.days}));
  FEES=Object.assign(FEES,d.fees||{});LAYOUT=d.layout||[];TILES=d.tiles||{};AISLES=d.aisles||{};STORE=Object.assign(STORE,d.store||{});
  SLIDES.length=0;
  (d.promos||[]).forEach(pr=>{const prod=byId(pr.product_id);SLIDES.push({land:'promo:'+pr.id,promo:pr,cls:pr.cls||'s1',eyebrow:esc(pr.eyebrow||''),title:esc(pr.title),text:esc(pr.text||''),cta:'Shop now',go:pr.product_id,end:Date.parse(pr.ends_at),art:pr.img?{id:'promo-'+pr.id,img:pr.img,shape:'box',c1:'#D49B41',short:''}:(prod||P[0])})});
  // forget basket and wishlist items that no longer exist
  S.cart=S.cart.filter(c=>{const p=byId(c.pid);return p&&p.sizes.some(s=>s.label===c.size&&!s.na)});
  S.wish=S.wish.filter(id=>byId(id));S.recent=S.recent.filter(id=>byId(id));
}
async function loadCatalog(){const d=await api('/api/catalog');applyCatalog(d);save()}

/* photos: real images; drawing only when a product has no photo yet */
function art(p){
  if(p&&p.img)return `<svg viewBox="0 0 140 140" aria-hidden="true"><image href="${esc(p.img)}" x="4" y="4" width="132" height="132" preserveAspectRatio="xMidYMid meet"/></svg>`;
  return drawArt(p);
}
/* ratings come from real, approved reviews */
function ratingFor(pid){const p=byId(pid);const r=p&&p.rating;return r?{avg:r.avg,n:r.n}:{avg:0,n:0}}
function ratingChip(p){const r=ratingFor(p.id);return r.n?`<span class="rating num" data-tip="${r.n} review${r.n>1?'s':''} from verified buyers"><span class="stars">★</span>${r.avg.toFixed(1)} <span class="hint">(${r.n})</span></span>`:`<span class="rating hint">New</span>`}

/* ---------- account ---------- */
const KIND_TYPE={placed:'pay',route:'del',done:'del',issue:'del',note:'del',refund:'ref',cancel:'ref',security:'sec',promo:'promo',chat:'chat'};
const relTime=t=>{const d=new Date(t),m=Math.round((Date.now()-d)/60000);if(m<1)return 'Just now';if(m<60)return m+' min ago';const today=new Date();if(d.toDateString()===today.toDateString())return 'Today, '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});const y=new Date(Date.now()-86400000);if(d.toDateString()===y.toDateString())return 'Yesterday';return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})};
function mapOrder(o){
  const st=o.status==='new'?'paid':o.status;
  const r=o.rider;
  return {id:o.id,date:new Date(o.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),items:(o.items||[]).map(i=>({pid:i.pid,size:i.size,qty:i.qty,swaps:i.swaps||[],name:i.name,price:i.price})),total:o.total,status:st,raw:o.status,since:Date.parse(o.updated_at||o.created_at),
    speed:o.speed_label||o.speed,addr:o.address+(o.area_label?', '+o.area_label:''),zone:o.zone_id,kg:+o.kg,email:o.email,phone:'',
    rider:r?{name:(r.driver?r.driver+' · ':'')+(r.partner||''),phone:r.phone||'',tracking:r.tracking||'',courier:true}:null,issue:o.issue,refunds:o.refunds||[]};
}
function mapMsg(m){return {id:m.id,type:KIND_TYPE[m.kind]||'del',title:m.title,body:m.body,time:relTime(m.created_at),read:m.read,link:m.order_id?'orders':''}}
async function loadAccount(){
  const me=await api('/api/me');
  S.user=me.user?{name:me.user.name||me.user.email.split('@')[0],email:me.user.email,phone:me.user.phone||'',at:Date.now(),id:me.user.id}:null;
  if(me.user){S.prefs.promo=!!me.user.promo_ok;S.addresses=(me.addresses||[]).map(a=>({id:a.id,label:a.label,street:a.street,landmark:a.landmark||'',zone:a.zone_id}));
    const [o,m]=await Promise.all([api('/api/me/orders'),api('/api/me/messages')]);
    S.orders=o.orders.map(mapOrder);S.inbox=m.messages.map(mapMsg);
  }else{S.inbox=[];S.addresses=[]} // a guest keeps the orders placed on this device
  save();
}
Object.assign(STATUS,{paid:['Paid · packing','paid'],issue:['Problem · we’ll update you','paid'],refunded:['Refunded','done'],cancelled:['Cancelled','done']});

/* ---------- sign up / sign in (6-digit email code, no password) ---------- */
auth={step:'email',mode:'signup',name:'',email:'',phone:'',agree:false,promo:false,err:'',resendAt:0,busy:false};
const AUTH_PERKS=[['truck','Track every order','See packing, dispatch and delivery in one place'],['pin','Saved addresses','Check out in seconds next time'],['star','Rate what you buy','Help other shoppers pick well'],['shield','No password to forget','We email you a one-time code']];
function authShell(inner){
  return `<div class="au2">
   <aside class="au2-side"><img src="/icon-sm.png" alt="" class="au2-logo"><h2>Welcome to <br>Tiada Marketplace</h2><p>Foodstuffs and cereals, delivered anywhere in Nigeria.</p>
    <ul>${AUTH_PERKS.map(x=>`<li><span>${ic(x[0],18)}</span><div><b>${x[1]}</b><small>${x[2]}</small></div></li>`).join('')}</ul></aside>
   <section class="au2-main">${inner}</section></div>`;
}
function vAuth(){
  if(auth.step==='code')return authShell(`<button class="au2-back" data-act="authback">${ic('back',16)} Use another email</button>
    <h1 class="au2-h">Check your email</h1><p class="au2-sub">We sent a 6-digit code to <b>${esc(auth.email)}</b>. It expires in 10 minutes.</p>
    <form id="auth-code" novalidate autocomplete="off">
      <div class="field"><label for="au-code">6-digit code</label><input id="au-code" class="num au2-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"></div>
      <div id="otp-err" class="alert" ${auth.err?'':'hidden'}>${esc(auth.err)}</div>
      <button class="btn" type="submit">${auth.mode==='signup'?'Verify and create my account':'Verify and sign in'}</button>
      <p class="hint au2-c"><span id="resend"></span></p>
      <p class="hint au2-c">Can’t see it? Check your spam or promotions folder.</p>
    </form>
    <div class="note-row warn" style="margin-top:14px">${ic('alert',16)}<span>Never share this code. Tiada staff will never ask for it.</span></div>`);
  const up=auth.mode==='signup';
  return authShell(`<div class="au2-tabs" role="tablist"><button role="tab" aria-selected="${up}" class="${up?'on':''}" data-authmode="signup">Create account</button><button role="tab" aria-selected="${!up}" class="${up?'':'on'}" data-authmode="signin">Sign in</button></div>
    <h1 class="au2-h">${up?'Create your account':'Welcome back'}</h1>
    <p class="au2-sub">${up?'It takes less than a minute. We’ll email you a code to confirm it’s you.':'Enter your email and we’ll send you a 6-digit code.'}</p>
    <form id="auth-email" novalidate>
      ${up?`<div class="field" id="f-name"><label for="au-name">Full name</label><input id="au-name" autocomplete="name" placeholder="e.g. Adeola Oladipo" maxlength="60" value="${esc(auth.name)}"><span class="err">Enter your name.</span></div>`:''}
      <div class="field" id="f-email"><label for="au-email">Email address</label><input id="au-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${esc(auth.email)}"><span class="err">Enter a valid email address.</span></div>
      ${up?`<div class="field" id="f-phone"><label for="au-phone">Phone number <span style="text-transform:none;font-weight:500">(optional)</span></label><input id="au-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0803 123 4567" value="${esc(auth.phone)}"><span class="err">Use an 11-digit Nigerian number.</span><span class="hint">Only used for delivery calls.</span></div>
      <label class="check-row" id="f-agree"><input type="checkbox" id="au-agree" ${auth.agree?'checked':''}><span>I agree to the <button type="button" class="link" style="font-size:13px;padding:0" data-go="privacy">privacy policy</button> and terms of sale.</span></label>
      <div id="agree-err" class="alert" hidden>Please accept the privacy policy to continue.</div>
      <label class="check-row"><input type="checkbox" id="au-promo" ${auth.promo?'checked':''}><span>Email me new stock and deals (you can turn this off any time).</span></label>`:''}
      <div id="auth-err" class="alert" ${auth.err?'':'hidden'}>${esc(auth.err)}</div>
      <button class="btn" type="submit">${up?'Create account':'Email me a code'}</button>
    </form>
    <p class="au2-switch">${up?'Already have an account? <button class="link" data-authmode="signin">Sign in</button>':'New to Tiada? <button class="link" data-authmode="signup">Create an account</button>'}</p>
    <div class="note-row safe" style="margin-top:12px">${ic('lock',16)}<span>Your details are only used for your orders. We never sell them or share them with advertisers.</span></div>`);
}
function tickResend(){const el=$('#resend');if(!el)return;const s=Math.ceil((auth.resendAt-Date.now())/1000);el.innerHTML=s>0?`Didn’t get it? Resend in <b class="num">${s}s</b>`:`<button type="button" class="link" data-act="resend">Resend code</button>`}
async function sendCode(){
  const r=await api('/api/auth/start',{body:{email:auth.email}});auth.resendAt=Date.now()+30000;
  if(r.devNote)toast(r.devNote);
}
async function doVerify(code){
  if(auth.busy)return;auth.busy=true;
  try{await loading('Checking your code','Signing you in securely',500);
    const r=await api('/api/auth/verify',{body:{email:auth.email,code,name:auth.mode==='signup'&&auth.name||undefined,phone:auth.mode==='signup'&&auth.phone?auth.phone.replace(/\D/g,''):undefined,promo_ok:auth.mode==='signup'?auth.promo:undefined}});
    await loading('Loading your account','',300);await loadAccount();
    auth={step:'email',mode:'signin',name:'',email:'',phone:'',agree:false,promo:false,err:'',resendAt:0,busy:false};
    toast(`Welcome${r.isNew?'':' back'}, ${S.user.name.split(' ')[0]}`);
    if(authNext){const f=authNext;authNext=null;render();f()}else render();
  }catch(e){auth.busy=false;auth.err=errMsg(e);render();const i=$('#au-code');i&&i.focus()}
}

/* ---------- checkout + real payment ---------- */
S.co.name=S.co.name||'';
function canPay(){return (S.co.name||'').trim().length>=2&&validEmail(S.co.email)&&validPhone(S.co.phone)&&validAddr(S.co.addr)&&deliveryFee().total!=null}
async function createPay(){
  try{
    const r=await api('/api/checkout',{body:{items:S.cart.map(c=>({pid:c.pid,size:c.size,qty:c.qty,swaps:c.swaps||[]})),email:S.co.email.trim(),name:S.co.name.trim(),phone:S.co.phone,address:S.co.addr.trim(),landmark:S.co.landmark||null,zone_id:S.co.zone,speed:S.co.speed,voucher:S.promo||null,note:S.co.swap||null,save_address:!!(S.user&&!S.co.addrId&&S.co.saveAddr)}});
    S.pay={id:r.order.id,ref:r.ref,total:r.order.total,acct:r.account,expires:Date.parse(r.account.expires_at)||Date.now()+30*60000,speed:r.order.speed};
    store.set('pay',S.pay);go('pay');
  }catch(e){toast(errMsg(e))}
}
function vPay(){
  const p=S.pay;if(!p)return vCart();const a=p.acct||{};
  return `<h1 class="page" style="text-align:center">Transfer to complete your order</h1><p class="sub" style="text-align:center">This account is for order ${p.id} only. Send the exact amount.</p>
  <div class="va">
    <span class="clock num" id="va-clock" data-tip="Account expires when the timer ends">--:--</span>
    <div class="bank">${esc(a.bank||'Bank')}</div>
    <div class="acct num"><span id="acct">${esc(a.number||'')}</span><button class="copy" data-copy="${esc(a.number||'')}" data-tip="Copy account number">Copy</button></div>
    <div class="hint">Account name: <b style="color:var(--ink)">${esc(a.name||'Tiada Marketplace')}</b></div>
    <div style="height:12px"></div>
    <div class="bank">Exact amount</div>
    <div class="amt num" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${naira(p.total)}<button class="copy" data-copy="${p.total}" data-tip="Copy exact amount">Copy</button></div>
    <div class="wait"><span class="pulse"></span>Waiting for your transfer. This page updates on its own once it lands, so there’s no receipt to upload.</div>
    <div class="note-row warn" style="margin-top:10px">${ic('alert',16)}<span>Before you send, check your bank app shows the account name above. If it shows anything else, stop and message us on WhatsApp ${esc(STORE.whatsapp)}.</span></div>
    <div class="note-row safe" style="margin-top:8px">${ic('shield',16)}<span>Tiada will never call or text to ask for your PIN, OTP or password.</span></div>
    <button class="btn gold" data-act="paid-check">I’ve made the payment</button>
    <p class="demo" id="pay-msg">Tap this after sending the transfer. We’ll confirm it with the bank.</p>
    <button class="btn ghost" data-act="cancelpay" style="height:42px">Cancel and go back to basket</button>
  </div>`;
}
let payPoll=null;
const PAID=['new','packed','route','done','issue','refunded','cancelled'];
function onPaid(order){
  clearInterval(payPoll);clearInterval(payTimer);
  const o=mapOrder(order);S.orders=[o,...S.orders.filter(x=>x.id!==o.id)];
  S.cart=[];S.promo=null;S.pay=null;store.set('pay',null);save();go('success');
  if(S.user)loadAccount().then(()=>{if(['success','account'].includes(S.route))renderNav()}).catch(()=>{});
}
async function pollPay(){
  if(!S.pay||S.route!=='pay')return;
  try{const r=await api(`/api/orders/${encodeURIComponent(S.pay.id)}/status?ref=${encodeURIComponent(S.pay.ref)}`);if(PAID.includes(r.status)&&r.order)onPaid(r.order)}catch(_){}
}
setInterval(pollPay,5000);
function vSuccess(){
  const o=S.orders[0];if(!o)return vHome();
  return `<div class="ok">
    <svg class="check" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><path d="M30 52l13 13 27-29"/></svg>
    <h1 class="page">Payment confirmed!</h1>
    <div class="code" data-tip="Your tracking code">${o.id}</div>
    <div class="panel" style="text-align:left">
      <p style="margin:0 0 8px">Save this code to track your order. We’ve emailed your confirmation to <b>${esc(maskEmail(o.email||S.co.email))}</b>, and we’ll email you again when it’s on the way and when it’s delivered.</p>
      <div class="line"><span>Amount paid</span><b class="num">${naira(o.total)}</b></div>
      <div class="line"><span>Delivery</span><span>${esc(o.speed)}</span></div>
      <div class="line"><span>Address</span><span style="text-align:right">${esc(o.addr)}</span></div>
    </div>
    <button class="btn" data-track="${o.id}">Track this order</button>
    <button class="btn ghost" data-go="home">Keep shopping</button>
  </div>`;
}

/* ---------- reviews from the server ---------- */
const RV={};
async function fetchReviews(pid,force){
  if(RV[pid]&&!force)return RV[pid];
  try{const r=await api('/api/reviews?pid='+encodeURIComponent(pid));RV[pid]=r}catch(_){RV[pid]={reviews:[],canReview:false,mine:null}}
  S.reviews[pid]=RV[pid].reviews.map(x=>({name:x.name,area:'',stars:x.stars,text:x.text,date:new Date(x.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),mine:x.mine,reply:x.reply}));
  if(RV[pid].mine&&RV[pid].mine.status!=='live')S.reviews[pid].unshift({name:'Your review',area:'Waiting for approval',stars:RV[pid].mine.stars,text:RV[pid].mine.text,mine:true});
  return RV[pid];
}
const purchased=pid=>!!(RV[pid]&&RV[pid].canReview);
function reviewsFor(pid){return S.reviews[pid]||[]}
function openProduct(id){fetchReviews(id).then(()=>openProductSync(id))}

/* ---------- live chat with real staff ---------- */
const CHAT_KEY='tiada_chat';
let chatPoll=null,lastMsgId=0;
const chatSess=()=>{try{return JSON.parse(localStorage.getItem(CHAT_KEY)||'null')}catch(_){return null}};
const setChatSess=v=>{try{localStorage.setItem(CHAT_KEY,JSON.stringify(v))}catch(_){}};
function chatStart(){clearTimeout(CH.idleT);clearTimeout(CH.warnT);S.chat=[];CH.mode='bot';CH.typing=false;CH.agent=null;lastMsgId=0;setChatSess(null);
  cpush('bot',`Hi${firstName()?' '+firstName():''}! 👋 I’m Tiada’s assistant. Ask me about prices, combos, delivery, payment or your order. Type <b>“person”</b> any time to chat with our team.`)}
async function ensureChat(){let s=chatSess();if(s)return s;const r=await api('/api/chat',{body:{action:'start'}});s={id:r.id,token:r.token};setChatSess(s);return s}
const plain=h=>String(h).replace(/<br\s*\/?>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').slice(0,1500);
async function logChat(who,text){try{const s=await ensureChat();const r=await api('/api/chat',{body:{action:'send',id:s.id,token:s.token,who,text:plain(text)}});if(r&&r.id)lastMsgId=Math.max(lastMsgId,r.id)}catch(_){}}
function chatSend(q){
  q=String(q).trim();if(!q)return;const ci=$('#chat-text');if(ci)ci.value='';
  cpush('me',esc(q));logChat('me',q);
  if(CH.mode==='ended')return;
  if(CH.mode==='agent'||CH.mode==='waiting'){disarmIdle();armIdle();return}
  const r=botAnswer(q);
  if(r==='HUMAN'){escalate();return}
  CH.typing=true;chatPaint();setTimeout(()=>{CH.typing=false;cpush('bot',r.t,{btn:r.btn});logChat('bot',r.t)},650);
}
async function escalate(){
  CH.mode='waiting';
  const t='No problem. I’ve let our support team know, and someone will join this chat shortly. They’ll see everything we’ve talked about.';
  cpush('bot',t);logChat('bot',t);
  cpush('sys','<span class="pulse"></span> Waiting for a team member to join…',{kind:'wait'});
  try{const s=await ensureChat();await api('/api/chat',{body:{action:'escalate',id:s.id,token:s.token}})}catch(_){}
  startChatPoll();
}
function agentReply(){}
async function pollChat(){
  const s=chatSess();if(!s||CH.mode==='ended'||CH.mode==='bot')return;
  try{const r=await api(`/api/chat?id=${s.id}&token=${s.token}&after=${lastMsgId}`);
    for(const m of r.messages){lastMsgId=Math.max(lastMsgId,m.id);
      if(m.who==='agent'){CH.typing=false;cpush('agent',esc(m.text));armIdle()}
      else if(m.who==='sys'&&!/You ended/.test(m.text)){S.chat=S.chat.filter(x=>x.kind!=='wait');cpush('sys',esc(m.text),{kind:/joined/.test(m.text)?'join':/ended|left/.test(m.text)?'end':''})}}
    if(r.status==='open'&&CH.mode==='waiting'){CH.mode='agent';CH.agent=r.agent||'Tiada';S.chat=S.chat.filter(x=>x.kind!=='wait');if(!$('#chat')){CH.unread++;toast(`${CH.agent} joined your chat`,['Open chat','__chat'])}chatPaint();armIdle()}
    if(r.status==='closed'&&CH.mode!=='ended'){CH.mode='ended';disarmIdle();chatPaint();if(!$('#chat'))toast('Your support chat has ended',['Open chat','__chat'])}
  }catch(_){}
}
function startChatPoll(){clearInterval(chatPoll);chatPoll=setInterval(pollChat,3000)}
function endChat(why){
  if(CH.mode==='ended')return;disarmIdle();CH.typing=false;S.chat=S.chat.filter(m=>m.kind!=='wait');
  cpush('sys',why==='idle'?'This chat ended because there was no reply.':'You ended the chat.',{kind:'end'});
  CH.mode='ended';chatPaint();clearInterval(chatPoll);
  const s=chatSess();if(s)api('/api/chat',{body:{action:'end',id:s.id,token:s.token}}).catch(()=>{});
}
const CHAT_IDLE_WARN_LIVE=5*60000,CHAT_IDLE_END_LIVE=8*60000;
function armIdle(){disarmIdle();if(CH.mode!=='agent')return;
  CH.warnT=setTimeout(()=>{if(CH.mode==='agent')cpush('sys','Are you still there? This chat will close in 3 minutes if there’s no reply.',{kind:'warn'})},CHAT_IDLE_WARN_LIVE);
  CH.idleT=setTimeout(()=>endChat('idle'),CHAT_IDLE_END_LIVE)}

/* ---------- order tracking: real statuses, estimated position (delivery partners don't share GPS) ---------- */
function timelineHTML(o){
  if(['issue','refunded','cancelled'].includes(o.status)){
    const is=o.issue||{},ref=(o.refunds||[]).reduce((a,r)=>a+(r.amount||0),0);
    return `<div class="note-row warn" style="margin-top:10px">${ic('alert',16)}<span>${o.status==='issue'?`<b>There’s a problem with this order.</b> ${esc(is.reason||'')}${is.eta?` New expected delivery: <b>${esc(is.eta)}</b>.`:''} We’ll email you with every update.`:o.status==='cancelled'?`<b>This order was cancelled.</b> ${esc(is.reason||'')} Your money is being refunded to the account you paid from.`:`<b>Refunded${ref?' '+naira(ref):''}.</b> It usually shows in your bank app within 1–3 working days.`}</span></div>`;
  }
  const order=['paid','packed','route','done'],ix=order.indexOf(o.status);
  const r=o.rider;
  const steps=[['Payment confirmed','Verified automatically by the bank'],['Packed at Ojota hub','Quality checked and sealed'],['On the way',r?`With ${esc(r.name)}${r.tracking?' · tracking '+esc(r.tracking):''}`:'Handed to a delivery partner once packed'],['Delivered','Enjoy your foodstuffs']];
  return `<ol class="timeline">${steps.map((s,i)=>`<li class="${i<ix||o.status==='done'?'done':i===ix?'now':''}"><span><b>${s[0]}</b><small>${s[1]}</small></span></li>`).join('')}</ol>`+
   (o.status==='route'?mapHTML(o):'')+(o.status==='route'&&r&&r.phone?`<div class="rider" style="margin-top:10px"><span>${o.zone&&String(o.zone).startsWith('st:')?'🚚':'🛵'} <b>${esc(r.name)}</b> · <span class="num">${fmtPhone(r.phone)}</span></span><button class="copy" data-copy="${esc(r.phone)}" data-tip="Copy driver’s number">Copy number</button></div>`:'');
}
function paintMaps(){
  document.querySelectorAll('.tmap').forEach(m=>{
    const id=m.dataset.map,km=+m.dataset.km,inter=m.dataset.inter==='1';
    const o=S.orders.find(x=>x.id===id),r=o&&o.rider;
    const p=.55; // no live GPS from delivery partners, so we show the route without guessing a time
    const path=m.querySelector('.rt-done'),L=path.getTotalLength(),pt=path.getPointAtLength(L*p);
    path.style.strokeDasharray=`${L*p} ${L}`;
    m.querySelector('.rdot').style.transform=`translate(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px)`;
    m.querySelector('.eta-t').innerHTML=`<b>On the way</b>${r&&r.name?' with '+esc(r.name):''}${r&&r.tracking?' · tracking '+esc(r.tracking):''}`;
  });
}

/* ---------- home page follows the admin “Store layout” ---------- */
function onSale(){return ALL.filter(p=>p.sale&&p.status!=='out')}
function landFor(id){
  if(id.startsWith('promo:')){const s=SLIDES.find(x=>x.land===id);if(!s)return null;const pr=byId(s.go);const cat=pr?pr.cat:'cereal';
    const same=ALL.filter(p=>p.cat===cat);
    return {cls:s.cls,slide:s,eyebrow:s.eyebrow,title:s.title,text:s.text,art:s.art,facts:[`${same.length} items`,...(onSale().length?[`${onSale().length} on sale`]:[])],
      rows:[...(pr?[['Featured',[pr]]]:[]),[(CATS.find(x=>x.id===cat)||{label:'More like this'}).label,same.filter(p=>p!==pr)],['On sale now',onSale()]]};}
  const fake={eyebrow:'',title:'',text:'',art:P[0]};
  if(id==='student')return {cls:'s2',slide:null,eyebrow:'Made for students',title:'Student combos',text:'Foodstuff packs from ₦5,000, plus budget breakfast picks for hostel life.',art:FOOD_COMBOS[1]||FOOD_COMBOS[0]||fake.art,facts:['Hostel delivery','Swap any item'],
    rows:[['Foodstuff combos',FOOD_COMBOS],['Budget picks under ₦5,000',under(5000).filter(p=>!p.items)],['Cereal combos',CEREAL_COMBOS]]};
  if(id==='deals')return {cls:'s3',slide:null,eyebrow:'This week’s deals',title:'Prices just dropped',text:'Promo prices while stock lasts.',art:onSale()[0]||fake.art,facts:[`${onSale().length} items on sale`],
    rows:[['On sale now',onSale().filter(p=>!p.items)],['Combos on sale',onSale().filter(p=>p.items)],['Fast selling',ALL.filter(p=>p.status==='fast')]]};
  if(id==='cereal-combos')return {cls:'s1',slide:null,eyebrow:'Cereal combos',title:'Cereal combo packages',text:'Ready-made breakfast bundles. Swap any item.',art:CEREAL_COMBOS[0]||fake.art,facts:[`${CEREAL_COMBOS.length} combos`,'Swap any item'],
    rows:[['Cereal combo packages',CEREAL_COMBOS],['Breakfast cereals',P.filter(p=>p.cat==='cereal')],['Milk & drinks',P.filter(p=>p.cat==='milk')]]};
  if(id.startsWith('cat:')){
    const c=id.slice(4);
    if(c==='all-sort'){const all=[...P].filter(p=>p.status!=='out').sort((a,b)=>priceOf(a,sizeOf(a)).now-priceOf(b,sizeOf(b)).now);
      return {cls:'cream',eyebrow:'Shop by aisle',title:'Lowest prices',text:'Everything sorted from the cheapest, so your money goes further.',art:all[0]||fake.art,facts:['Sorted by price'],rows:[['Under ₦3,500',under(3500)],['All products, cheapest first',all]]}}
    const lab=(CATS.find(x=>x.id===c)||{}).label||'Products',items=ALL.filter(p=>p.cat===c);
    const sale=items.filter(p=>p.sale&&p.status!=='out'),fast=items.filter(p=>p.status==='fast');
    return {cls:c.includes('combo')?'s2':'cream',eyebrow:'Shop by aisle',title:lab,text:(CATS.find(x=>x.id===c)||{}).sub||'',art:items.find(p=>p.img)||items[0]||fake.art,facts:[`${items.length} items`,...(sale.length?[`${sale.length} on sale`]:[])],
      rows:[...(sale.length?[['On sale now',sale]]:[]),...(fast.length?[['Fast selling',fast]]:[]),[`All ${lab.toLowerCase()}`,items]]};
  }
  return null;
}
const secOn=k=>{const x=LAYOUT.find(l=>l[0]===k);return !x||x[1]!==false};
const tileOn=k=>TILES[k]!==false, aisleOn=k=>AISLES[k]!==false;
function vHome(){
  const list=filtered();
  const home=!S.q&&S.cat==='all';
  if(!home){
    const label=S.q?`Results for “${esc(S.q)}”`:CATS_EXTRA[S.cat]||(CATS.find(c=>c.id===S.cat)||{}).label;
    return `<div class="chips" role="tablist" style="margin-top:4px">${CATS.map(c=>`<button class="chip ${S.cat===c.id&&!S.q?'on':''}" data-cat="${c.id}">${c.id==='all'?'All':c.label}</button>`).join('')}</div>
    <div class="sec-h"><h2>${label}</h2><span style="display:flex;gap:10px;align-items:center"><span class="hint num">${list.length} item${list.length===1?'':'s'}</span><select id="sort" class="sortsel" aria-label="Sort products"><option value="pop" ${S.sort==='pop'?'selected':''}>Popular</option><option value="low" ${S.sort==='low'?'selected':''}>Price: low to high</option><option value="high" ${S.sort==='high'?'selected':''}>Price: high to low</option></select></span></div>
    ${list.length?`<div class="pgrid" id="grid">${list.map(card).join('')}</div>`:`<div class="empty"><b>Nothing here yet</b>New stock is added often. Check back soon.</div>`}`;
  }
  if(!ALL.length)return `<div class="empty"><b>Loading the store…</b></div>`;
  const flash=ALL.filter(p=>(p.sale||p.status==='fast'||p.stock<5)&&p.status!=='out').slice(0,10);
  const circMap={cereal:['Cereals','cereal'],milk:['Milk & Drinks','milk'],grain:['Oats & Custard','grain'],ccombo:['Cereal Combos','ccombo'],fcombo:['Foodstuff Combos','fcombo'],sort:['Lowest prices','all-sort']};
  const firstOf=c=>(c==='all-sort'?[...P].sort((a,b)=>priceOf(a,sizeOf(a)).now-priceOf(b,sizeOf(b)).now):ALL.filter(p=>p.cat===c)).find(p=>p.img)||ALL[0];
  const endOfDay=new Date();endOfDay.setHours(23,59,59,0);
  const wa=(STORE.whatsapp||'').replace(/\D/g,'').replace(/^0/,'234');
  const S_={
    slider:()=>sliderHTML(),
    tiles:()=>{const t=[tileOn('wa')?`<a class="tile t1" href="https://wa.me/${wa}" target="_blank" rel="noopener" data-tip="Chat with us on WhatsApp"><b>Order on WhatsApp</b><small>${esc(STORE.whatsapp||'')}</small></a>`:'',
      tileOn('student')?`<button class="tile t2" data-land="student" data-tip="Student combos and budget picks"><b>Student combos</b><small>From ${naira(Math.min(...FOOD_COMBOS.map(c=>priceOf(c,'Package').now),999999))}</small><span class="tic">${ic('sack',58)}</span></button>`:'',
      tileOn('track')?`<button class="tile t3" data-go="track" data-tip="Track with your TD code"><b>Track my order</b><small>Use your TD code</small><span class="tic">${ic('box',58)}</span></button>`:''].filter(Boolean);
      return t.length?`<div class="tiles" style="grid-template-columns:repeat(${t.length},minmax(0,1fr))">${t.join('')}</div>`:''},
    flash:()=>flash.length?blockRail('','Flash Sales','Today’s best prices while stock lasts','data-cat="all-sale"',flash,` <span class="fs-timer" data-end="${endOfDay.getTime()}">⏱ ${hms(endOfDay-Date.now())}</span>`):'',
    aisles:()=>{const on=Object.keys(circMap).filter(aisleOn);return on.length?`<section class="block cream"><div class="block-h"><div><h2>All your essentials in one place</h2><small>Shop by aisle</small></div><button class="block-go" data-go="catalog" aria-label="All categories" data-tip="All categories">›</button></div>
      <div class="circles">${on.map(k=>`<button class="circ" data-land="cat:${circMap[k][1]}"><span class="c">${art(firstOf(circMap[k][1]))}</span>${circMap[k][0]}</button>`).join('')}</div></section>`:''},
    cereals:()=>plainRail('Breakfast cereals','data-cat="cereal"',P.filter(p=>p.cat==='cereal')),
    ccombos:()=>CEREAL_COMBOS.length?blockRail('gold','Cereal combo packages','Ready-made breakfast bundles · swap any item','data-cat="ccombo"',CEREAL_COMBOS):'',
    milk:()=>plainRail('Milk & beverages','data-cat="milk"',P.filter(p=>p.cat==='milk'||p.cat==='grain')),
    fcombos:()=>FOOD_COMBOS.length?blockRail('','Foodstuff combos','Rice, spaghetti, garri, beans and more','data-cat="fcombo"',FOOD_COMBOS):'',
    recent:()=>S.recent.length?plainRail('Recently viewed','data-accgo="recent"',S.recent.slice(0,10).map(byId).filter(Boolean)):'',
    recs:()=>`<div class="sec-h"><h2>Recommended for you</h2></div><div class="pgrid" id="grid">${[...P].sort((a,b)=>(b.status==='fast')-(a.status==='fast')).map(card).join('')}</div>`,
    note:()=>`<div class="note">Combo quantities differ by package and delivery is added at checkout. You can swap anything in a combo for something else worth the same amount.</div>`,
  };
  const order=LAYOUT.length?LAYOUT.map(l=>l[0]):Object.keys(S_);
  return order.filter(k=>S_[k]&&secOn(k)).map(k=>S_[k]()).join('\n');
}

/* ---------- intercept actions that now talk to the server ---------- */
document.addEventListener('submit',async e=>{
  const f=e.target,id=f.id;
  if(!['auth-email','auth-code','rev-form','addr-form','track-form'].includes(id))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(id==='auth-email'){
    const up=auth.mode==='signup',v=q=>{const el=$(q);return el?el.value.trim():''};
    if(up){auth.name=v('#au-name');auth.phone=v('#au-phone');auth.agree=$('#au-agree').checked;auth.promo=$('#au-promo').checked}
    auth.email=v('#au-email').toLowerCase();auth.err='';
    const eOk=validEmail(auth.email),nOk=!up||auth.name.length>=2,pOk=!up||!auth.phone||validPhone(auth.phone),aOk=!up||auth.agree;
    $('#f-email').classList.toggle('bad',!eOk);if(up){$('#f-name').classList.toggle('bad',!nOk);$('#f-phone').classList.toggle('bad',!pOk);$('#agree-err').hidden=aOk}
    if(!eOk||!nOk||!pOk||!aOk){f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake');return}
    try{await loading('Sending your code',`To ${auth.email}`,400);await sendCode();auth.step='code';render();const i=$('#au-code');i&&i.focus()}
    catch(err){auth.err=errMsg(err);render()}
    return}
  if(id==='auth-code'){const code=($('#au-code').value||'').replace(/\D/g,'');if(code.length!==6){auth.err='Enter all 6 digits.';render();return}doVerify(code);return}
  if(id==='rev-form'){if(!revOk())return;const pid=draft.pid;
    try{await loading('Posting your review','',500);await api('/api/reviews',{body:{pid,stars:draft.stars,text:draft.text.trim(),anon:draft.anon}});await fetchReviews(pid,true);openProductSync(pid);toast('Thanks! Your review will appear after a quick check.')}
    catch(err){toast(errMsg(err))}
    return}
  if(id==='addr-form'){
    const street=$('#ad-street').value.trim(),zone=$('#ad-zone').value;
    $('#fa-street').classList.toggle('bad',street.length<=5);$('#fa-zone').classList.toggle('bad',!zone);
    if(street.length<=5||!zone)return;
    try{const r=await api('/api/me/addresses',{body:{label:$('#ad-label').value,street,landmark:$('#ad-landmark').value.trim()||null,zone_id:zone}});
      S.addresses.push({id:r.address.id,label:r.address.label,street:r.address.street,landmark:r.address.landmark||'',zone:r.address.zone_id});save();render();toast('Address saved')}
    catch(err){toast(errMsg(err))}
    return}
  if(id==='track-form'){
    const code=S.track.code.trim().toUpperCase(),l4=S.track.last4;
    if(!/^TD-\d{5,9}$/.test(code)||l4.length!==4){S.track.err='Enter a code like TD-84920 and the last 4 digits of your phone.';S.track.res=null;render();return}
    try{await loading('Finding your order','',400);const r=await api('/api/track',{body:{code,last4:l4}});const o=mapOrder(r.order);S.orders=[o,...S.orders.filter(x=>x.id!==o.id)];S.track.code=code;S.track.res=o.id;S.track.err=''}
    catch(err){S.track.res=null;S.track.err=errMsg(err)}
    render();return}
},true);
document.addEventListener('click',e=>{
  const t=e.target.closest('button,a,[data-act]');if(!t)return;const d=t.dataset,a=d.act;
  const stop=()=>{e.preventDefault();e.stopImmediatePropagation()};
  if(a==='authback'){stop();auth.step='email';auth.err='';render();return}
  if(d.authmode){stop();auth.mode=d.authmode;auth.err='';render();return}
  if(a==='resend'){stop();sendCode().then(()=>{tickResend();toast('New code sent')}).catch(err=>toast(errMsg(err)));return}
  if(a==='pay'){stop();loading('Creating your secure transfer account','A one-time account just for this order',300).then(createPay);return}
  if(a==='paid-check'){stop();const p=S.pay;if(!p)return;
    loading('Checking your payment','Confirming your transfer with the bank',600).then(()=>api(`/api/orders/${encodeURIComponent(p.id)}/check`,{body:{ref:p.ref}})).then(r=>{if(PAID.includes(r.status)&&r.order)onPaid(r.order);else{const m=$('#pay-msg');if(m)m.textContent=r.message||'Not received yet.';toast('Not received yet. It can take a minute or two.')}}).catch(err=>toast(errMsg(err)));return}
  if(a==='cancelpay'&&t.dataset.armed){store.set('pay',null)}
  if(a==='signout'){api('/api/auth/logout',{body:{}}).catch(()=>{});S.orders=[];S.inbox=[];S.addresses=[];S.reviews={};store.set('pay',null)}
  if(a==='deleteacct'){stop();loading('Deleting your account','Removing your profile, addresses and reviews',600).then(()=>api('/api/me',{method:'DELETE'})).then(()=>{S.user=null;S.accView='menu';S.inbox=[];S.addresses=[];S.reviews={};S.orders=[];save();go('home');toast('Your account has been deleted')}).catch(err=>toast(errMsg(err)));return}
  if(a==='readall'){api('/api/me/messages',{body:{all:true,read:true}}).catch(()=>{})}
  if(d.notif){const id=d.notif;if(/^[0-9a-f-]{36}$/.test(id))api('/api/me/messages',{body:{ids:[id],read:true}}).catch(()=>{})}
  if(d.unread){api('/api/me/messages',{body:{ids:[d.unread],read:false}}).catch(()=>{})}
  if(d.delmsg&&t.dataset.armed){api('/api/me/messages',{body:{ids:[d.delmsg],remove:true}}).catch(()=>{})}
  if(d.deladdr&&t.dataset.armed){api('/api/me/addresses?id='+encodeURIComponent(d.deladdr),{method:'DELETE'}).catch(()=>{})}
  if(d.delrev&&t.dataset.armed){stop();api('/api/reviews?pid='+encodeURIComponent(d.delrev),{method:'DELETE'}).then(()=>fetchReviews(d.delrev,true)).then(()=>{openProductSync(d.delrev);toast('Review deleted')}).catch(err=>toast(errMsg(err)));return}
},true);
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.pref==='promo')api('/api/me',{method:'PATCH',body:{promo_ok:t.checked}}).catch(()=>{});
},true);
document.addEventListener('input',e=>{
  if(e.target.id==='co-name'){S.co.name=e.target.value;const b=document.querySelector('[data-act="pay"]');if(b)b.disabled=!canPay()}
  if(e.target.id==='au-code'){const v=e.target.value.replace(/\D/g,'').slice(0,6);e.target.value=v;if(v.length===6)doVerify(v)}
},true);
/* the "new stock" pill now checks the server for real changes */
let catalogStamp='';
async function checkFresh(){try{const d=await api('/api/catalog');const stamp=JSON.stringify(d.products.map(p=>[p.id,p.sizes,p.status,p.stock,p.hidden]))+JSON.stringify(d.promos);if(catalogStamp&&stamp!==catalogStamp&&S.route==='home')$('#fresh').classList.add('show');catalogStamp=stamp}catch(_){}}

/* ---------- start up ---------- */
async function boot(){
  const L=$('#loader');$('#ld-msg').textContent='Loading fresh stock';$('#ld-sub').textContent='Getting today’s prices';L.hidden=false;
  try{
    await Promise.all([loadCatalog(),loadAccount().catch(()=>{})]);
    catalogStamp='';checkFresh();setInterval(checkFresh,120000);
    const pend=store.get('pay',null);if(pend&&pend.expires>Date.now()){S.pay=pend;S.route='pay'}
    const h=location.hash||'';
    if(h.startsWith('#track-')){S.track={code:h.slice(7),last4:'',res:null,err:''};S.route='track'}
    else if(h==='#account'||h==='#reviews'){S.route='account';if(h==='#reviews'&&S.user)S.accView='reviews'}
  }catch(e){toast('We couldn’t load the store. Check your connection and refresh.')}
  hideLoader();render();netState();
}
if(/[?&]test=1\b/.test(location.search))window.T={get S(){return S},go,render,save,openChat};
boot();
