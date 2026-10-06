/* ---------- native browser loading for in-page actions ----------
   Moving between pages is a real page load, so the browser shows its own loading by itself.
   For actions that stay on the page (sign-in, payment check, saving), a hidden frame keeps
   loading while the overlay is on screen, so the tab spinner runs too. */
(function(){
  const L=document.getElementById('loader');if(!L)return;
  const shown=()=>!L.hidden&&!L.classList.contains('out');
  let fr=null,guard=null;
  function start(){
    if(fr||window.__tiadaLeaving)return;
    fr=document.createElement('iframe');fr.setAttribute('aria-hidden','true');fr.tabIndex=-1;fr.title='';
    fr.style.cssText='position:fixed;left:-10px;top:-10px;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    fr.src='/api/hold?t='+Date.now();document.body.appendChild(fr);
    clearTimeout(guard);guard=setTimeout(stop,20000);
  }
  function stop(){clearTimeout(guard);if(!fr)return;const f=fr;fr=null;try{f.src='about:blank'}catch(_){}f.remove()}
  window.__tiadaStopFrame=stop;
  new MutationObserver(()=>{shown()?start():stop()}).observe(L,{attributes:true,attributeFilter:['hidden','class']});
  if(document.readyState==='complete'){if(shown())start()}else window.addEventListener('load',()=>{if(shown())start()},{once:true});
})();
