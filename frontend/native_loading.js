/* ---------- native browser loading: while our loading overlay is on screen, a hidden frame keeps
   loading, so the browser's own indicator (tab spinner, mobile progress bar, stop button) runs too.
   It stops the moment the overlay hides. Works in Chrome, Edge, Safari, Firefox and Samsung Internet. */
(function(){
  const L=document.getElementById('loader');if(!L)return;
  let fr=null,guard=null;
  const shown=()=>!L.hidden&&!L.classList.contains('out');
  function start(){
    if(fr)return;
    fr=document.createElement('iframe');
    fr.setAttribute('aria-hidden','true');fr.tabIndex=-1;fr.title='';
    fr.style.cssText='position:fixed;left:-10px;top:-10px;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    fr.src='/api/hold?t='+Date.now();
    document.body.appendChild(fr);
    clearTimeout(guard);guard=setTimeout(stop,24000);
  }
  function stop(){clearTimeout(guard);if(!fr)return;const f=fr;fr=null;try{f.src='about:blank'}catch(_){}f.remove()}
  new MutationObserver(()=>{shown()?start():stop()}).observe(L,{attributes:true,attributeFilter:['hidden','class']});
  if(shown())start();
})();
