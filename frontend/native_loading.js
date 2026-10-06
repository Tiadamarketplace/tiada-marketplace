/* ---------- native browser loading: while our loading overlay is on screen, the browser's own
   loading indicator (tab spinner, phone progress bar, stop button) runs too, and stops when it hides.
   Two methods together so it works everywhere:
   1. Navigation API (Chrome, Edge, Samsung Internet, Opera, newer Safari): a same-page navigation
      that stays "in progress" until the overlay hides — this drives the phone progress bar too.
   2. A hidden frame that keeps loading (all browsers, including Firefox and older Safari). */
(function(){
  const L=document.getElementById('loader');if(!L)return;
  const shown=()=>!L.hidden&&!L.classList.contains('out');
  const MAX=20000;
  /* method 1 */
  const nav=window.navigation&&typeof window.navigation.navigate==='function'?window.navigation:null;
  let release=null,navOn=false;
  if(nav)nav.addEventListener('navigate',e=>{
    if(e.info!=='tiada-loading'||!e.canIntercept)return;
    e.intercept({scroll:'manual',focusReset:'manual',handler:()=>new Promise(res=>{
      release=res;if(!shown())res();setTimeout(res,MAX);
    })});
  });
  function navStart(){
    if(!nav||navOn)return;navOn=true;
    try{const r=nav.navigate(location.href,{history:'replace',info:'tiada-loading'});
      Promise.resolve(r&&r.finished).catch(()=>{}).then(()=>{navOn=false;release=null;if(shown())navStart()})}
    catch(_){navOn=false}
  }
  function navStop(){if(release){const r=release;release=null;r()}}
  /* method 2 */
  let fr=null,guard=null;
  function frStart(){
    if(fr)return;
    fr=document.createElement('iframe');fr.setAttribute('aria-hidden','true');fr.tabIndex=-1;fr.title='';
    fr.style.cssText='position:fixed;left:-10px;top:-10px;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    fr.src='/api/hold?t='+Date.now();document.body.appendChild(fr);
    clearTimeout(guard);guard=setTimeout(frStop,MAX);
  }
  function frStop(){clearTimeout(guard);if(!fr)return;const f=fr;fr=null;try{f.src='about:blank'}catch(_){}f.remove()}
  function start(){navStart();frStart()}
  function stop(){navStop();frStop()}
  new MutationObserver(()=>{shown()?start():stop()}).observe(L,{attributes:true,attributeFilter:['hidden','class']});
  if(document.readyState==='complete'){if(shown())start()}else window.addEventListener('load',()=>{if(shown())start()},{once:true});
})();
