/* ================= LIVE LAYER: the admin desk talks to the real server =================
   The screens above are the design. This part signs staff in, loads real orders, stock, chats
   and settings from /api/admin, and sends every change back to the server. Nothing is kept in
   the browser's storage. */
const api=async(path,opts={})=>{
  const r=await fetch(path,{method:opts.method||(opts.body?'POST':'GET'),headers:opts.body?{'Content-Type':'application/json'}:{},body:opts.body?JSON.stringify(opts.body):undefined,credentials:'same-origin',cache:'no-store'});
  let j={};try{j=await r.json()}catch(_){}
  if(r.status===401&&S.auth&&!/\/(login|setup|me)\b/.test(path)){S.auth=null;login={step:'pw',email:'',err:'Your session ended. Please sign in again.'};closeModal();render()}
  if(!r.ok)throw Object.assign(new Error(j.error||'Something went wrong. Please try again.'),{status:r.status});
  return j;
};
const errMsg=e=>(e&&e.message)||'Something went wrong. Please try again.';
const CAT_NAME={cereal:'Cereals',milk:'Milk & drinks',grain:'Oats & custard',ccombo:'Cereal combos',fcombo:'Foodstuff combos'};
const CAT_CODE=Object.fromEntries(Object.entries(CAT_NAME).map(([k,v])=>[v,k]));
const LAYOUT_META=Object.fromEntries(S.layout.map(x=>[x[0],x.slice()]));
const TILE_META=S.tiles.map(t=>t.slice()),AISLE_META=S.aisles.map(t=>t.slice());
const REGION_NAME={sw:'South-West',ss:'South-South & South-East',nc:'North-Central & Abuja',nw:'North'};
const GONE={},FRESH=new Set();
let SEEN=null,SEEN_CHAT=null,setupNeeded=false,setupInfo=null;
S.staff=[];S.customers=[];
delete AUD.lagos;delete AUD.other;AUD.all[0]='All customers · service notices only';AUD.promo[0]='Customers who opted in to promotions';AUD.test=['Only me · a test email',1];

const busy=m=>{$('#ldt').textContent=m;$('#loader').hidden=false};
const idle=()=>{$('#loader').hidden=true};
const keepY=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
async function run(msg,fn,okMsg){busy(msg);try{const r=await fn();await refresh();keepY();if(okMsg)toast(typeof okMsg==='function'?okMsg(r):okMsg);return r}catch(e){toast(errMsg(e));try{await refresh();keepY()}catch(_){}}finally{idle()}}

/* ---------- server data → the shapes the screens use ---------- */
function applyData(d){
  S.auth=Object.assign({at:(S.auth&&S.auth.at)||Date.now()},d.me);
  QUICK[0]=`Hi! I’m ${d.me.name.split(' ')[0]} from Tiada. How can I help?`;
  S.products=d.products.map(p=>({id:p.id,name:p.name,cat:CAT_NAME[p.cat]||p.cat,items:p.items||undefined,sizes:p.sizes.map(s=>({label:s.label,price:s.price,sale:s.sale||null,kg:+s.kg,na:!!s.na||s.price==null})),status:p.status,stock:p.stock,low:p.low,hidden:p.hidden,img:p.img||null}));
  const Z=Object.fromEntries(d.zones.map(z=>[z.id,z]));
  S.orders=d.orders.map(o=>{(o.items||[]).forEach(i=>{if(i.pid)GONE[i.pid]=i.name});const z=Z[o.zone_id]||{};
    return {id:o.id,name:o.name,email:o.email,phone:o.phone,addr:o.address,landmark:o.landmark||'',area:z.label||o.area_label||'',state:!!z.state,speed:o.speed_label||o.speed,fee:o.delivery_fee,
      items:(o.items||[]).map(i=>[i.pid,i.size,i.qty,(i.swaps||[]).map(w=>[w.from,w.to]),i.price,i.name]),total:o.total,at:Date.parse(o.paid_at||o.created_at),status:o.status,prev:o.prev_status,
      rider:o.rider?Object.assign({name:o.rider.partner,courier:true},o.rider):null,confirm:o.confirm?Object.assign({},o.confirm,{at:Date.parse(o.confirm.at)}):null,
      issue:o.issue||{reason:''},refunds:(o.refunds||[]).map(r=>Object.assign({},r,{at:Date.parse(r.at)})),reason:(o.issue&&o.issue.reason)||'',bank:'their bank',note:o.note||'',fresh:FRESH.has(o.id)}});
  S.sent=d.messages.map(m=>({id:m.id,oid:m.order_id,kind:m.kind,at:Date.parse(m.created_at),to:m.email_to,data:m.data||{},ok:m.email_ok}));
  S.promos=d.promos.map(p=>({id:p.id,title:p.title,eyebrow:p.eyebrow||'',text:p.text||'',art:p.product_id,img:p.img||null,cls:p.cls||'',end:Date.parse(p.ends_at),on:p.is_on}));
  S.reviews=d.reviews.map(r=>({id:r.id,pid:r.product_id,name:r.name,stars:r.stars,text:r.text,at:Date.parse(r.created_at),status:r.status,order:r.order_id||'',reply:r.reply||undefined}));
  S.log=d.activity.map(a=>({t:a.text,at:Date.parse(a.created_at),by:a.staff_name||'System'}));
  const st=d.settings||{},fees=st.fees||{};
  S.fees={min:fees.min||0,lagosKg:fees.lagosKg||0,interKg:fees.interKg||0,van:fees.van||0,same:fees.same||0,express:fees.express||0,eco:fees.eco||0,
    areas:d.zones.filter(z=>!z.state).map(z=>[z.label,z.fee,z.id]),
    regions:Object.keys(REGION_NAME).map(k=>{const zs=d.zones.filter(z=>z.region===k),r=(fees.regions||{})[k]||{};return [REGION_NAME[k],r.fee!=null?r.fee:(zs[0]?zs[0].fee:0),r.days||(zs[0]&&zs[0].days)||'',k]})};
  const lay=st.layout&&st.layout.length?st.layout:Object.keys(LAYOUT_META).map(k=>[k,true]);
  S.layout=lay.filter(l=>LAYOUT_META[l[0]]).map(([k,on])=>{const m=LAYOUT_META[k].slice();m[3]=on!==false;return m});
  Object.keys(LAYOUT_META).forEach(k=>{if(!S.layout.some(x=>x[0]===k)){const m=LAYOUT_META[k].slice();m[3]=true;S.layout.push(m)}});
  S.tiles=TILE_META.map(t=>[t[0],t[1],(st.tiles||{})[t[0]]!==false]);
  S.aisles=AISLE_META.map(t=>[t[0],t[1],(st.aisles||{})[t[0]]!==false]);
  S.staff=d.staff||[];S.customers=d.customers||[];S.testMode=!!d.testMode;S.testPending=d.testPending||[];
  AUD.all[1]=S.customers.length;AUD.promo[1]=S.customers.filter(c=>c.promo_ok).length;
  applyChats(d.chats);
  computeSales();
  const nw=S.orders.filter(o=>o.status==='new'&&SEEN&&!SEEN.has(o.id));
  nw.forEach(o=>{FRESH.add(o.id);o.fresh=true});
  if(nw.length){const o=nw[0],a=$('#alertbar');a.innerHTML=`${ic('bell')} <span>New paid order <b class="num">${o.id}</b> · ${naira(o.total)} · ${esc(o.name)}${nw.length>1?` (+${nw.length-1} more)`:''}</span><button class="btn sm" data-viewo="${o.id}">Open</button>`;a.classList.add('show');setTimeout(()=>a.classList.remove('show'),9000);beep()}
  SEEN=new Set(S.orders.map(o=>o.id));
}
function applyChats(list){
  S.chats=list.map(c=>({id:c.id,name:c.name||'Guest',phone:c.email||'Guest · not signed in',status:c.status==='bot'?'closed':c.status,at:Date.parse(c.updated_at),order:'',agent:c.agent,
    msgs:c.messages.map(m=>[m.who,m.text,Date.parse(m.created_at)])}));
  const waiting=S.chats.filter(c=>c.status==='waiting');
  const nw=waiting.filter(c=>SEEN_CHAT&&!SEEN_CHAT.has(c.id));
  if(nw.length&&S.view!=='chat'){const a=$('#alertbar');a.innerHTML=`${ic('chat')} <span><b>${esc(nw[0].name)}</b> wants to chat with a person</span><button class="btn sm" data-view="chat">Open chat</button>`;a.classList.add('show');setTimeout(()=>a.classList.remove('show'),9000);beep()}
  SEEN_CHAT=new Set(waiting.map(c=>c.id).concat(SEEN_CHAT?[...SEEN_CHAT]:[]));
}
function computeSales(){
  for(let i=0;i<7;i++)DAYS[i]=new Date(Date.now()-(6-i)*86400000);
  for(let i=0;i<7;i++){const dd=DAYS[i].toDateString();SALES[i]=S.orders.filter(o=>o.status!=='cancelled'&&new Date(o.at).toDateString()===dd).reduce((a,o)=>a+o.total-(o.refunds||[]).reduce((x,r)=>x+r.amount,0),0)}
}
function topSellers(){
  const n={},since=Date.now()-7*86400000;
  S.orders.filter(o=>o.at>=since&&o.status!=='cancelled').forEach(o=>o.items.forEach(it=>{if(it[0])n[it[0]]=(n[it[0]]||0)+it[2]}));
  return Object.entries(n).sort((a,b)=>b[1]-a[1]).slice(0,5);
}
async function refresh(){applyData(await api('/api/admin/data'))}

/* ---------- test mode: Paystack test accounts can't receive transfers, so the owner can mark a test order paid ---------- */
function vDash(){
  if(!S.testMode)return vDashBase();
  return `<div class="note" style="margin-bottom:14px;flex-wrap:wrap">${ic('alert',16)}<span style="flex:1;min-width:220px"><b>Paystack is in test mode.</b> Test bank transfers can’t really be paid, so you can mark a waiting test order as paid here to try the rest (emails, packing, delivery). This box disappears when you switch to your live Paystack key.</span></div>
  ${S.testPending.length?`<div class="card pad" style="margin-bottom:14px"><h3>Test orders waiting for payment</h3><div class="list">${S.testPending.map(o=>`<div class="li"><span class="t"><b class="num">${esc(o.id)} · ${esc(o.name)}</b><small>${ago(Date.parse(o.created_at))}</small></span><span class="num" style="font-weight:800">${naira(o.total)}</span><button class="btn sm" data-testpay="${esc(o.id)}">Mark as paid (test)</button></div>`).join('')}</div></div>`:''}
  ${vDashBase()}`;
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-testpay]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();const id=t.dataset.testpay;
  run('Marking test order as paid',()=>api('/api/admin/testpay',{body:{id}}),`${id} is paid. Check the email and the Orders page.`)},true);

/* ---------- order emails: what really went out ---------- */
function mailRows(o){
  const sent=S.sent.filter(m=>m.oid===o.id).slice().reverse();
  const next=o.status==='new'||o.status==='packed'?'route':o.status==='route'?'done':null;
  return (sent.length?sent.map(m=>`<div class="mrow"><span style="color:${m.ok===false||['refund','cancel','issue'].includes(m.kind)?'var(--red)':'var(--green)'}">${ic(m.ok===false?'alert':'check',16)}</span><span style="flex:1"><b>${MAIL_L[m.kind]||esc(m.kind)}</b> <span class="hint">${m.ok===false?'saved to their inbox, but the email didn’t send':'sent '+dstr(m.at)+', '+tstr(m.at)}</span></span><button class="btn sm soft" data-email="${o.id}|${m.kind}|${m.id}">View</button></div>`).join(''):'<p class="hint" style="margin:0 0 6px">No emails yet.</p>')
   +(next?`<div class="mrow"><span style="color:#C9C2B1">${ic('clock',16)}</span><span style="flex:1"><b>${MAIL_L[next]}</b> <span class="hint">sends automatically at this step</span></span></div>`:'');
}

/* ---------- sign in (password + authenticator app) and first-time owner setup ---------- */
login={step:'check',email:'',err:'',ticket:''};
function vLogin(){
  const err=login.err?`<div class="err">${esc(login.err)}</div>`:'';
  let box='';
  if(login.step==='check')box=`<h2>Opening…</h2>`;
  else if(login.step==='setup')box=`<h2>Set up the owner account</h2><p class="hint" style="margin:0 0 14px">This only appears once, before anyone has an account. You’ll need the setup key you added in Vercel (SETUP_TOKEN) and an authenticator app such as Google Authenticator.</p>
     <form id="f-setup" novalidate>${err}
      <div class="field"><label for="s-name">Your full name</label><input id="s-name" autocomplete="name" maxlength="60" value="${esc(login.name||'')}"></div>
      <div class="field"><label for="s-email">Your email</label><input id="s-email" type="email" autocomplete="username" value="${esc(login.email||'')}"></div>
      <div class="field"><label for="s-pw">Choose a password</label><input id="s-pw" type="password" autocomplete="new-password" placeholder="At least 10 characters"></div>
      <div class="field"><label for="s-token">Setup key</label><input id="s-token" type="password" autocomplete="off" placeholder="From Vercel → Environment Variables"></div>
      <button class="btn" type="submit" style="width:100%;height:46px">Continue</button></form>`;
  else if(login.step==='setup2')box=`<h2>Scan this code</h2><p class="hint" style="margin:0 0 10px">Open your authenticator app, tap <b>+</b>, then scan. It adds “Tiada Admin”.</p>
     <div style="text-align:center;margin:0 0 10px"><img src="${setupInfo.qr}" alt="QR code for your authenticator app" width="200" height="200" style="border-radius:12px;border:1px solid var(--line)"></div>
     <p class="hint" style="margin:0 0 12px;word-break:break-all">Can’t scan? Type this key instead: <b class="num">${esc(setupInfo.secret)}</b></p>
     <form id="f-setup2" novalidate>${err}<div class="field"><label for="otp1">6-digit code from the app</label><input id="otp1" class="otp1 num" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"></div>
      <button class="btn" type="submit" style="width:100%;height:46px">Finish setup and open desk</button></form>`;
  else if(login.step==='pw')box=`<h2>Sign in</h2><p class="hint" style="margin:0 0 16px">Use your staff email and password.</p>
     <form id="f-login" novalidate>${err}
      <div class="field"><label for="l-email">Staff email</label><input id="l-email" type="email" autocomplete="username" value="${esc(login.email||'')}"></div>
      <div class="field"><label for="l-pw">Password</label><input id="l-pw" type="password" autocomplete="current-password" placeholder="••••••••"></div>
      <button class="btn" type="submit" style="width:100%;height:46px">Continue</button>
      <p class="hint" style="margin:12px 0 0;text-align:center"><button type="button" class="btn ghost sm" data-act="lforgot">Forgot password?</button></p>
      ${setupNeeded?`<p class="hint" style="margin:12px 0 0;text-align:center"><button type="button" class="btn ghost sm" data-act="gosetup">First time here? Set up the owner account</button></p>`:''}</form>`;
  else if(login.step==='forgot')box=`<h2>Forgot your password?</h2><p class="hint" style="margin:0 0 16px">Enter your staff email. We’ll send a link to choose a new password. You’ll also need your authenticator app.</p>
     <form id="f-forgot" novalidate>${err}
      <div class="field"><label for="fg-email">Staff email</label><input id="fg-email" type="email" autocomplete="username" value="${esc(login.email||'')}"></div>
      <button class="btn" type="submit" style="width:100%;height:46px">Email me a reset link</button>
      <div class="row" style="margin-top:10px"><span class="sp"></span><button type="button" class="btn ghost sm" data-act="lback">Back to sign in</button></div></form>`;
  else if(login.step==='sent')box=`<h2>Check your email</h2><p class="hint" style="margin:0 0 14px">${esc(login.msg||'')}</p>
     <div class="safe" style="margin:0 0 14px">${ic('clock',16)}<span>Can’t see it? Check spam or promotions. The link only works once.</span></div>
     <button type="button" class="btn" style="width:100%;height:46px" data-act="lback">Back to sign in</button>`;
  else if(login.step==='reset')box=`<h2>Choose a new password</h2><p class="hint" style="margin:0 0 16px">${login.lost?'Enter the setup key from Vercel (SETUP_TOKEN). You’ll scan a new authenticator code next.':'Then enter the 6-digit code from your authenticator app to confirm it’s you.'}</p>
     <form id="f-reset" novalidate>${err}
      <div class="field"><label for="rs-pw">New password</label><input id="rs-pw" type="password" autocomplete="new-password" placeholder="At least 10 characters"></div>
      <div class="field"><label for="rs-pw2">Type it again</label><input id="rs-pw2" type="password" autocomplete="new-password"></div>
      ${login.lost?`<div class="field"><label for="rs-key">Setup key</label><input id="rs-key" type="password" autocomplete="off" placeholder="From Vercel → Environment Variables"></div>`
        :`<div class="field"><label for="otp1">6-digit code</label><input id="otp1" class="otp1 num" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"></div>`}
      <button class="btn" type="submit" style="width:100%;height:46px">Save new password</button>
      <p class="hint" style="margin:12px 0 0;text-align:center"><button type="button" class="btn ghost sm" data-act="llost">${login.lost?'I have my authenticator app':'Lost your authenticator app?'}</button></p>
      ${login.lost?`<p class="hint" style="margin:8px 0 0">Only the owner can use the setup key. Other staff: ask the owner to reset your access from Security.</p>`:''}</form>`;
  else if(login.step==='reset2')box=`<h2>Scan your new code</h2><p class="hint" style="margin:0 0 10px">Open your authenticator app, tap <b>+</b>, then scan. Delete the old “Tiada Admin” entry afterwards.</p>
     <div style="text-align:center;margin:0 0 10px"><img src="${login.qr}" alt="QR code for your authenticator app" width="200" height="200" style="border-radius:12px;border:1px solid var(--line)"></div>
     <p class="hint" style="margin:0 0 12px;word-break:break-all">Can’t scan? Type this key instead: <b class="num">${esc(login.secret||'')}</b></p>
     <form id="f-reset2" novalidate>${err}<div class="field"><label for="otp1">6-digit code from the app</label><input id="otp1" class="otp1 num" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"></div>
      <button class="btn" type="submit" style="width:100%;height:46px">Finish</button></form>`;
  else box=`<h2>Two-step check</h2><p class="hint" style="margin:0 0 12px">Enter the 6-digit code from your authenticator app.</p>
     <form id="f-otp" novalidate>${err}
      <div class="field"><label for="otp1">6-digit code</label><input id="otp1" class="otp1 num" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" aria-label="6-digit code"></div>
      <button class="btn" type="submit" style="width:100%;height:46px">Verify and open desk</button>
      <div class="row" style="margin-top:10px"><span class="sp"></span><button type="button" class="btn ghost sm" data-act="lback">Back</button></div></form>`;
  return `<div class="login">
   <section class="lart"><img src="${ICONSRC}" alt="Tiada Marketplace" style="width:64px"><div><h1>Tiada Admin Desk</h1><p>Run orders, stock, promotions and customer support for Tiada Marketplace from one place.</p></div><p class="hint" style="color:#9FBFAA">Staff access only. Every action is recorded in the activity log.</p></section>
   <section class="lform"><div class="lbox">${box}
    <div class="safe" style="margin-top:16px">${ic('shield',16)}<span>The desk locks after 15 minutes of inactivity. Customer card details and bank logins are never stored here.</span></div>
   </div></section></div>`;
}
async function openDesk(){busy('Opening your desk');await refresh();S.view='dash';idle();render();toast(`Welcome, ${S.auth.name.split(' ')[0]}`)}

/* ---------- security: staff accounts and the activity log ---------- */
function vSecurity(){
  const owner=S.auth.role==='Owner';
  return `<div class="dash" style="margin-top:0;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)">
   <div style="display:flex;flex-direction:column;gap:14px">
    <div class="card pad"><h3>Your session</h3><div class="kv" style="margin-top:8px"><span>Signed in as</span><b>${esc(S.auth.name)} (${esc(S.auth.role)})</b><span>Email</span><b>${esc(S.auth.email)}</b><span>Since</span><b>${tstr(S.auth.at)}</b><span>Two-step check</span><b style="color:var(--green)">On</b><span>Auto lock</span><b>After 15 minutes idle</b></div>
     <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-act="logout">${ic('logout',14)} Sign out of this device</button><button class="btn soft sm" data-act="pwopen">Change my password</button></div></div>
    <div class="card pad"><h3>Staff</h3>
     ${owner?`<div class="list">${S.staff.map(s=>`<div class="li"><span class="av" style="width:34px;height:34px;font-size:12px;${s.active?'':'background:#E2DED3;color:#6B7A70'}">${esc(s.name.split(' ').map(w=>w[0]).join('').slice(0,2))}</span><span class="t"><b>${esc(s.name)}</b><small>${esc(s.email)}${s.active?'':' · switched off'}</small></span><span class="pill p-packed">${esc(s.role)}</span>${s.email!==S.auth.email?`<button class="btn sm ghost" data-staff="reset|${s.id}" title="New password and authenticator">Reset</button><button class="btn sm ghost" data-staff="${s.active?'off':'on'}|${s.id}">${s.active?'Switch off':'Switch on'}</button>`:''}</div>`).join('')}</div>
      <form id="f-staff" novalidate style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px"><b style="font-size:13px">Add a staff member</b>
       <div class="grid2" style="margin-top:8px"><div class="field"><label for="st-name">Name</label><input id="st-name" maxlength="60"></div><div class="field"><label for="st-email">Email</label><input id="st-email" type="email"></div></div>
       <div class="field"><label for="st-role">Access</label><select id="st-role"><option value="staff">Staff · orders, stock and flash sales</option><option value="support">Support · live chat and reviews</option><option value="owner">Owner · everything, including refunds</option></select></div>
       <button class="btn" type="submit" style="width:100%">${ic('plus',16)} Add and show their sign-in details</button></form>`
     :`<p class="hint" style="margin:0">Only the owner can add or remove staff.</p>`}
     <p class="hint" style="margin:8px 0 0">Each person signs in with their own account so the log shows who did what.</p></div>
    <div class="safe">${ic('shield',16)}<span>Payments are confirmed by Paystack, not typed in by staff. Bank logins, card numbers and PINs never reach this desk.</span></div>
   </div>
   <div class="card pad"><h3>Activity log</h3><div class="log" style="margin-top:8px">${S.log.length?S.log.slice(0,80).map(l=>`<div class="li" style="padding:8px 0"><span class="t"><b style="font-size:13px;white-space:normal">${esc(l.t)}</b><small>${esc(l.by)} · ${new Date(l.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></span></div>`).join(''):'<p class="hint">Actions will be listed here.</p>'}</div></div>
  </div>`;
}
function showCreds(title,email,r){
  $('#modal').innerHTML=`<div class="scrim center"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
   <h2>${esc(title)}</h2><p class="hint" style="margin:0 0 10px">Give these to them privately (in person is best). This is the only time the password is shown.</p>
   <div class="kv" style="margin-bottom:10px"><span>Email</span><b>${esc(email)}</b><span>Password</span><b class="num" style="font-size:16px">${esc(r.password)}</b></div>
   <p class="hint" style="margin:0 0 6px">They scan this with their authenticator app:</p>
   <div style="text-align:center"><img src="${r.qr}" alt="Authenticator QR code" width="180" height="180" style="border-radius:12px;border:1px solid var(--line)"></div>
   <p class="hint" style="word-break:break-all">Key: <b class="num">${esc(r.secret)}</b></p>
   <button class="btn" data-close style="width:100%;height:44px">I’ve passed these on</button></div></div>`;
}
function openPw(){
  $('#modal').innerHTML=`<div class="scrim center" data-close><div class="modal" role="dialog" aria-modal="true" aria-label="Change password"><button class="x" data-close aria-label="Close">×</button><h2>Change my password</h2>
   <form id="f-pw" novalidate><div class="field"><label for="pw-cur">Current password</label><input id="pw-cur" type="password" autocomplete="current-password"></div>
   <div class="field"><label for="pw-new">New password</label><input id="pw-new" type="password" autocomplete="new-password" placeholder="At least 10 characters"></div>
   <button class="btn" type="submit" style="width:100%;height:44px">Save new password</button></form></div></div>`;
}

/* ---------- helpers that send changes ---------- */
async function orderAct(o,body,msg,filter){
  const r=await run(msg,()=>api('/api/admin/orders/'+encodeURIComponent(o.id),{body}),r=>r&&r.email&&!r.email.ok?`Saved. The email didn’t send: ${r.email.error||'check email setup'}`:{packed:`${o.id} packed. Stock updated.`,resume:'Order is back on track'}[body.action]||`Saved and emailed ${o.email}`);
  if(r){S.ofilter=filter||S.ofilter;S.oq='';S.sel=o.id;keepY()}
}
const saveLayout=log=>api('/api/admin/settings',{body:{key:'layout',value:S.layout.map(x=>[x[0],x[3]]),log}});
const saveTiles=log=>api('/api/admin/settings',{body:{key:'tiles',value:Object.fromEntries(S.tiles.map(t=>[t[0],t[2]])),log}});
const saveAisles=log=>api('/api/admin/settings',{body:{key:'aisles',value:Object.fromEntries(S.aisles.map(t=>[t[0],t[2]])),log}});
async function quick(p,msg){try{await p;if(msg)toast(msg)}catch(e){toast(errMsg(e));await refresh().catch(()=>{});keepY()}}
const upload=(dataUrl,folder)=>api('/api/admin/upload',{body:{dataUrl,folder}}).then(r=>r.url);

/* ---------- forms ---------- */
document.addEventListener('submit',async e=>{
  const f=e.target,id=f.id;
  const mine=['f-setup','f-setup2','f-login','f-otp','f-forgot','f-reset','f-reset2','f-deliv','f-upd','f-dispatch','f-edit','f-promo','f-bc','f-chat','f-reply','f-fees','f-staff','f-pw'];
  if(!mine.includes(id))return;
  e.preventDefault();e.stopImmediatePropagation();
  const v=s=>($(s)||{value:''}).value;
  if(id==='f-setup'){login.name=v('#s-name').trim();login.email=v('#s-email').trim();
    busy('Checking your setup key');
    try{setupInfo=await api('/api/admin/setup',{body:{action:'start',token:v('#s-token').trim(),name:login.name,email:login.email,password:v('#s-pw')}});login.step='setup2';login.err=''}catch(err){login.err=errMsg(err)}
    idle();render();const i=$('#otp1');i&&i.focus();return}
  if(id==='f-setup2'){const code=v('#otp1').replace(/\D/g,'');busy('Creating your account');
    try{await api('/api/admin/setup',{body:{action:'finish',ticket:setupInfo.ticket,code}});setupInfo=null;setupNeeded=false;await openDesk()}catch(err){idle();login.err=errMsg(err);render();$('#otp1')&&$('#otp1').focus()}
    return}
  if(id==='f-login'){login.email=v('#l-email').trim();busy('Checking your details');
    try{const r=await api('/api/admin/login',{body:{step:'pw',email:login.email,password:v('#l-pw')}});login.ticket=r.ticket;login.step='otp';login.err=''}catch(err){login.err=errMsg(err)}
    idle();render();($('#otp1')||$('#l-pw')||{focus(){}}).focus();return}
  if(id==='f-forgot'){login.email=v('#fg-email').trim();if(!/^\S+@\S+\.\S+$/.test(login.email)){login.err='Enter a valid staff email.';render();return}
    busy('Sending your reset link');
    try{const r=await api('/api/admin/reset',{body:{action:'request',email:login.email}});login.msg=r.message;login.step='sent';login.err=''}catch(err){login.err=errMsg(err)}
    idle();render();return}
  if(id==='f-reset'){const pw=v('#rs-pw'),pw2=v('#rs-pw2');
    if(pw.length<10){login.err='Use at least 10 characters for the password.';render();return}
    if(pw!==pw2){login.err='The two passwords don’t match.';render();return}
    const body={action:'finish',token:login.token,password:pw};
    if(login.lost){body.setupKey=v('#rs-key').trim();if(!body.setupKey){login.err='Enter the setup key.';render();return}}
    else{body.code=v('#otp1').replace(/\D/g,'');if(body.code.length!==6){login.err='Enter all 6 digits.';render();return}}
    busy('Saving your new password');
    try{const r=await api('/api/admin/reset',{body});
      if(r.ticket){login.ticket=r.ticket;login.qr=r.qr;login.secret=r.secret;login.step='reset2';login.err=''}
      else{login={step:'pw',email:r.email||'',err:'',ticket:''};toast('Password changed. Sign in with your new password.')}}
    catch(err){login.err=errMsg(err);if(/expired|already used/.test(login.err)){login.step='forgot'}}
    idle();render();($('#otp1')||$('#rs-pw')||$('#l-pw')||{focus(){}}).focus();return}
  if(id==='f-reset2'){const code=v('#otp1').replace(/\D/g,'');if(code.length!==6){login.err='Enter all 6 digits.';render();return}
    busy('Finishing');
    try{const r=await api('/api/admin/reset',{body:{action:'confirm',ticket:login.ticket,code}});login={step:'pw',email:r.email||'',err:'',ticket:''};toast('All set. Sign in with your new password and code.')}
    catch(err){login.err=errMsg(err)}
    idle();render();($('#otp1')||$('#l-pw')||{focus(){}}).focus();return}
  if(id==='f-otp'){const code=v('#otp1').replace(/\D/g,'');if(code.length!==6){login.err='Enter all 6 digits.';render();return}
    busy('Verifying code');
    try{await api('/api/admin/login',{body:{step:'code',ticket:login.ticket,code}});login={step:'pw',email:login.email,err:'',ticket:''};await openDesk()}
    catch(err){idle();login.err=errMsg(err);if(/password again/.test(login.err))login.step='pw';render();($('#otp1')||$('#l-pw')).focus()}
    return}
  const o=S.orders.find(x=>x.id===S.sel);
  if(id==='f-deliv'){const c=(f.querySelector('input[name=dconf]:checked')||{}).value||'driver',lab=CONFIRM.find(x=>x[0]===c)[1];closeModal();
    orderAct(o,{action:'done',how:lab,note:v('#dl-note').trim()||undefined},'Marking as delivered','done');return}
  if(id==='f-dispatch'){const partner=v('#d-partner'),trk=v('#d-trk').trim(),driver=v('#d-driver').trim(),ph=v('#d-ph').replace(/\D/g,''),cost=+v('#d-cost').replace(/\D/g,'')||0;
    let okk=true;if(!trk){$('#fd-trk').classList.add('bad');$('#d-trk').focus();okk=false}if(ph&&ph.length<10){$('#fd-ph').classList.add('bad');okk=false}if(!okk)return;
    closeModal();orderAct(o,{action:'route',partner,tracking:trk,driver:driver||undefined,phone:ph||undefined,cost},'Booking saved · emailing customer','route');return}
  if(id==='f-upd'){const k=upd.k,D=updData(o);
    if(k==='route'&&!o.rider){closeModal();setTimeout(()=>openDispatch(o),260);return}
    if(k==='refund'&&!D.full&&(!D.amount||D.amount>o.total)){$('#fu-amt').classList.add('bad');toast(`Enter an amount up to ${naira(o.total)}`);return}
    if(k==='note'&&!(D.note||'').trim()){$('#fu-note').classList.add('bad');$('#u-note').focus();return}
    const opt=s=>s&&String(s).trim()?String(s).trim():undefined;
    const body={packed:{action:'packed'},route:o.rider?{action:'route',partner:o.rider.partner,tracking:o.rider.tracking||'-',driver:opt(o.rider.driver),phone:opt(o.rider.phone),cost:o.rider.cost||0}:null,
      done:{action:'done',how:CONFIRM.find(x=>x[0]===(upd.conf||'driver'))[1]},issue:{action:'issue',reason:D.reason,note:opt(D.note),eta:opt(D.eta)},
      refund:{action:'refund',full:!!D.full,amount:D.full?undefined:+D.amount,reason:D.reason,note:opt(D.note)},cancel:{action:'cancel',reason:D.reason,note:opt(D.note)},note:{action:'note',note:(D.note||'').trim()}}[k];
    closeModal();
    orderAct(o,body,{packed:'Marking as packed',route:'Marking as on the way',done:'Marking as delivered',issue:'Reporting problem',refund:'Sending refund through Paystack',cancel:'Cancelling and refunding',note:'Sending message'}[k],
      k==='packed'?'packed':k==='route'?'route':k==='done'?'done':k==='note'?S.ofilter:'issues');return}
  if(id==='f-edit'){const pid=f.dataset.id,isNew=pid==='new',name=v('#e-name').trim();if(!name){$('#fe-name').classList.add('bad');$('#e-name').focus();return}
    const sizes=[...f.querySelectorAll('[data-sz]')].map(tr=>{const lab=tr.querySelector('td').textContent.trim();const pr=+tr.querySelector('[data-f=price]').value||null,sa=+tr.querySelector('[data-f=sale]').value||null,kg=+tr.querySelector('[data-f=kg]').value||0;return {label:lab,price:pr,sale:pr&&sa&&sa<pr?sa:null,kg,na:!pr}});
    if(!sizes.some(s=>!s.na)){toast('Add a regular price for at least one size');return}
    const img=draftImg,items=$('#e-items')?v('#e-items').split('\n').map(x=>x.trim()).filter(Boolean):null;
    const body={id:isNew?undefined:pid,name,cat:CAT_CODE[v('#e-cat')]||'cereal',items,sizes,stock:Math.max(0,+v('#e-stock')||0),low:Math.max(0,+v('#e-low')||0),status:v('#e-status'),hidden:!$('#e-vis').checked};
    closeModal();
    run(isNew?'Adding to store':'Saving changes',async()=>{body.img=img&&img.startsWith('data:')?await upload(img,'products'):(img||null);return api('/api/admin/products',{body})},isNew?`${name} is now in the store`:`${name} updated in the store`);return}
  if(id==='f-promo'){const pid=f.dataset.id,isNew=pid==='new',title=v('#p-title').trim(),end=new Date(v('#p-end')).getTime();
    if(!title){$('#fp-title').classList.add('bad');return}if(!end||end<=Date.now()){$('#fp-end').classList.add('bad');toast('Pick an end time in the future');return}
    const img=draftImg,old=S.promos.find(x=>x.id===pid)||{};
    const body={id:isNew?undefined:pid,title,eyebrow:v('#p-eye').trim(),text:v('#p-text').trim(),product_id:v('#p-art')||null,cls:old.cls||'',ends_at:new Date(end).toISOString(),is_on:$('#p-on').checked};
    closeModal();
    run(isNew?'Launching flash sale':'Saving',async()=>{body.img=img&&img.startsWith('data:')?await upload(img,'banners'):(img||null);return api('/api/admin/promos',{body})},body.is_on?'Banner is live in the store':'Saved (switched off)');return}
  if(id==='f-bc'){if(!bc.subj.trim()){$('#fb-subj').classList.add('bad');$('#bc-subj').focus();return}if(bc.body.trim().length<10){$('#fb-body').classList.add('bad');$('#bc-body').focus();return}
    const n=AUD[bc.aud][1];
    if(!bc.confirm){bc.confirm=true;const btn=f.querySelector('button:not([type])');btn.innerHTML=bc.aud==='test'?'Tap again to send yourself a test':`Tap again to send to ${n.toLocaleString()} ${n===1?'person':'people'}`;btn.classList.add('gold');setTimeout(()=>{bc.confirm=false;if(btn.isConnected){btn.innerHTML=ic('send',16)+' Broadcast email';btn.classList.remove('gold')}},4000);return}
    bc.confirm=false;const aud=bc.aud;
    const r=await run(aud==='test'?'Sending you a test':`Sending to ${n.toLocaleString()} customers`,()=>api('/api/admin/broadcast',{body:{subject:bc.subj.trim(),body:bc.body.trim(),audience:aud}}),r=>aud==='test'?`Test sent to ${S.auth.email}`:r.sent<r.total?`Sent ${r.sent} of ${r.total}. The rest need a verified email domain in Resend.`:`Sent to ${r.sent} customers`);
    if(r&&aud!=='test'){bc={subj:'',body:'',aud:'promo',confirm:false};render()}
    return}
  if(id==='f-chat'){const t=v('#c-text').trim();if(!t)return;const c=S.chats.find(x=>x.id===S.chatSel);if(!c)return;
    c.msgs.push(['agent',t,Date.now()]);render();const i=$('#c-text');i&&i.focus();
    api('/api/admin/chat',{body:{action:'send',id:c.id,text:t}}).then(pollChats).catch(err=>toast(errMsg(err)));return}
  if(id==='f-reply'){const rid=f.dataset.id;closeModal();run('Posting reply',()=>api('/api/admin/reviews',{body:{id:rid,reply:v('#r-text').trim()||null}}),'Reply posted');return}
  if(id==='f-fees'){const F=S.fees,num=s=>+String(v(s)).replace(/\D/g,'')||0;
    const body={min:num('#fe-min'),lagosKg:num('#fe-lkg'),interKg:num('#fe-ikg'),van:num('#fe-van'),same:num('#fe-same'),express:num('#fe-exp'),eco:F.eco,
      areas:[...f.querySelectorAll('[data-area]')].map(i=>({id:F.areas[+i.dataset.area][2],fee:+i.value.replace(/\D/g,'')||0})),
      regions:Object.fromEntries([...f.querySelectorAll('[data-region]')].map(i=>[F.regions[+i.dataset.region][3],+i.value.replace(/\D/g,'')||0]))};
    run('Saving delivery fees',()=>api('/api/admin/fees',{body}),'Delivery fees saved');return}
  if(id==='f-staff'){const name=v('#st-name').trim(),email=v('#st-email').trim(),role=v('#st-role');
    if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Add their name and a valid email');return}
    busy('Creating their account');
    try{const r=await api('/api/admin/staff',{body:{action:'add',name,email,role}});await refresh();idle();render();showCreds(`${name} can now sign in`,email,r)}catch(err){idle();toast(errMsg(err))}
    return}
  if(id==='f-pw'){const cur=v('#pw-cur'),nx=v('#pw-new');if(nx.length<10){toast('Use at least 10 characters');return}
    busy('Saving');try{await api('/api/admin/staff',{body:{action:'password',current:cur,next:nx}});closeModal();toast('Password changed')}catch(err){toast(errMsg(err))}idle();return}
},true);

/* ---------- buttons ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button,[data-close],a,label.drop');if(!t)return;const d=t.dataset,a=d.act;
  const stop=()=>{e.preventDefault();e.stopImmediatePropagation()};
  if(d.osel)FRESH.delete(d.osel);
  if(d.viewo)FRESH.delete(d.viewo);
  if(a==='gosetup'){stop();login.step='setup';login.err='';render();return}
  if(a==='lback'){stop();login.step='pw';login.err='';render();return}
  if(a==='lforgot'){stop();login.email=($('#l-email')||{value:login.email}).value.trim();login.step='forgot';login.err='';render();const i=$('#fg-email');i&&i.focus();return}
  if(a==='llost'){stop();login.lost=!login.lost;login.err='';render();return}
  if(a==='logout'){stop();busy('Signing out');api('/api/admin/logout',{body:{}}).catch(()=>{}).then(()=>{S.auth=null;login={step:'pw',email:'',err:'',ticket:''};idle();render()});return}
  if(a==='pwopen'){stop();openPw();return}
  if(d.staff){stop();const [k,sid]=d.staff.split('|'),s=S.staff.find(x=>x.id===sid);if(!s)return;
    if(!t.dataset.armed){t.dataset.armed=1;const old=t.textContent;t.textContent='Tap again';setTimeout(()=>{if(t.isConnected){delete t.dataset.armed;t.textContent=old}},3000);return}
    if(k==='reset'){busy('Resetting');api('/api/admin/staff',{body:{action:'reset',id:sid}}).then(async r=>{await refresh();idle();render();showCreds(`New sign-in details for ${s.name}`,s.email,r)}).catch(err=>{idle();toast(errMsg(err))});return}
    run(k==='off'?'Switching off':'Switching on',()=>api('/api/admin/staff',{body:{action:'active',id:sid,active:k==='on'}}),k==='off'?`${s.name} can no longer sign in`:`${s.name} can sign in again`);return}
  if(d.oact==='pack'||d.oact==='resume'){stop();const o=S.orders.find(x=>x.id===S.sel);if(!o)return;
    orderAct(o,{action:d.oact==='pack'?'packed':'resume'},d.oact==='pack'?'Marking as packed':'Updating order',d.oact==='pack'?'packed':null);return}
  if(d.stk){stop();const [pid,n]=d.stk.split('|');const p=S.products.find(x=>x.id===pid);if(!p)return;
    p.stock=Math.max(0,p.stock+ +n);if(p.stock>0&&p.status==='out')p.status='in';if(!p.stock)p.status='out';keepY();
    quick(api('/api/admin/products',{method:'PATCH',body:{id:pid,stockDelta:+n}}));return}
  if(d.hide){stop();const p=S.products.find(x=>x.id===d.hide);if(!p)return;p.hidden=!p.hidden;keepY();
    quick(api('/api/admin/products',{method:'PATCH',body:{id:p.id,hidden:p.hidden}}),p.hidden?`${p.name} is hidden from shoppers`:`${p.name} is back in the shop`);return}
  if(d.mv){stop();const [i,dir]=d.mv.split('|').map(Number),j=i+dir;if(j<0||j>=S.layout.length)return;const L=S.layout;[L[i],L[j]]=[L[j],L[i]];keepY();
    quick(saveLayout(`Moved “${L[j][1]}” ${dir<0?'up':'down'} on the home page`));return}
  if(d.tile){stop();const x=S.tiles[+d.tile];x[2]=!x[2];keepY();quick(saveTiles(`${x[2]?'Showed':'Hid'} the “${x[1]}” tile`),x[2]?`“${x[1]}” is showing`:`“${x[1]}” is hidden`);return}
  if(d.aisle){stop();const x=S.aisles[+d.aisle];x[2]=!x[2];keepY();quick(saveAisles(`${x[2]?'Showed':'Hid'} the “${x[1]}” aisle`),x[2]?`“${x[1]}” is showing`:`“${x[1]}” is hidden`);return}
  if(a==='lay-reset'){stop();S.layout.forEach(x=>x[3]=true);S.tiles.forEach(x=>x[2]=true);S.aisles.forEach(x=>x[2]=true);keepY();
    quick(Promise.all([saveLayout('Reset the home page layout'),saveTiles(),saveAisles()]),'Everything is showing again');return}
  if(d.pdel){stop();if(!t.dataset.armed){t.dataset.armed=1;t.textContent='Tap again to delete';setTimeout(()=>{if(t.isConnected){delete t.dataset.armed;t.textContent='Delete'}},3000);return}
    closeModal();run('Deleting',()=>api('/api/admin/promos?id='+encodeURIComponent(d.pdel),{method:'DELETE'}),'Flash sale deleted');return}
  if(d.rv){stop();const [rid,st]=d.rv.split('|');run(st==='live'?'Approving':'Hiding',()=>api('/api/admin/reviews',{body:{id:rid,status:st}}),st==='live'?'Review is now live in the store':'Review hidden from the store');return}
  if(a==='cjoin'){stop();const c=S.chats.find(x=>x.id===S.chatSel);if(!c)return;run('Joining chat',()=>api('/api/admin/chat',{body:{action:'join',id:c.id}})).then(()=>{const i=$('#c-text');i&&i.focus()});return}
  if(a==='cend'){stop();const c=S.chats.find(x=>x.id===S.chatSel);if(!c)return;run('Ending chat',()=>api('/api/admin/chat',{body:{action:'end',id:c.id}}),'Chat ended');return}
  if(a==='fillpw'||a==='fillcode'){stop();return}
},true);
document.addEventListener('change',e=>{
  const t=e.target,stop=()=>e.stopImmediatePropagation();
  if(t.dataset.status){stop();const p=S.products.find(x=>x.id===t.dataset.status);if(!p)return;p.status=t.value;if(t.value==='out')p.stock=0;const lab=t.selectedOptions[0].text;keepY();
    quick(api('/api/admin/products',{method:'PATCH',body:{id:p.id,status:t.value}}),`${p.name}: ${lab}`);return}
  if(t.dataset.sec){stop();const x=S.layout[+t.dataset.sec];x[3]=t.checked;keepY();quick(saveLayout(`${x[3]?'Showed':'Hid'} “${x[1]}” on the home page`),x[3]?`${x[1]} is showing`:`${x[1]} is hidden from shoppers`);return}
  if(t.dataset.ptog){stop();const p=S.promos.find(x=>x.id===t.dataset.ptog);if(!p)return;p.on=t.checked;keepY();quick(api('/api/admin/promos',{method:'PATCH',body:{id:p.id,is_on:p.on}}),p.on?'Banner is live in the store':'Banner removed from the store');return}
},true);
document.addEventListener('input',e=>{
  if(e.target.id==='otp1'){e.stopImmediatePropagation();const t=e.target;t.value=t.value.replace(/\D/g,'').slice(0,6);if(t.value.length===6)fireForm(t.form)}
},true);

/* ---------- keep the desk up to date ---------- */
const typing=()=>{const a=document.activeElement;return a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.id!=='oq'&&a.id!=='iq'&&a.id!=='cq'};
async function poll(){
  if(!S.auth||document.hidden)return;
  try{await refresh();if(!$('#modal').innerHTML&&!typing())keepY()}catch(_){}
}
let chatSig='';
async function pollChats(){
  if(!S.auth||S.view!=='chat'||document.hidden)return;
  try{const d=await api('/api/admin/data?part=chats');const sig=JSON.stringify(d.chats.map(c=>[c.id,c.status,c.messages.length]));if(sig===chatSig)return;chatSig=sig;
    applyChats(d.chats);if($('#modal').innerHTML)return;
    const i=$('#c-text'),val=i?i.value:'',foc=document.activeElement===i;render();const j=$('#c-text');if(j){j.value=val;if(foc)j.focus()}}catch(_){}
}
async function bootAdmin(){
  busy('Opening your desk');
  try{const m=await api('/api/admin/me');
    const rm=/[#&]reset=([\w.-]+)/.exec(location.hash);
    if(rm){history.replaceState(null,'',location.pathname+location.search);login={step:'reset',email:'',err:'',ticket:'',token:rm[1],lost:false}}
    else if(m.staff){await refresh();S.view='dash'}
    else{const s=await api('/api/admin/setup');setupNeeded=s.needed;login={step:s.needed?'setup':'pw',email:'',err:'',ticket:''}}}
  catch(e){login={step:'pw',email:'',err:errMsg(e),ticket:''}}
  idle();render();
  setInterval(poll,20000);setInterval(pollChats,4000);
}
if(/[?&]test=1\b/.test(location.search))window.T={get S(){return S},render,refresh};
bootAdmin();
