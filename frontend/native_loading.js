/* ---------- native browser loading: whenever our loading overlay shows, the browser's own
   loading indicator (tab spinner / progress bar) runs too, and stops when the overlay hides.
   Uses the Navigation API (Chrome, Edge, Samsung Internet, Opera, newer Safari); other browsers just show our overlay. */
(function(){
  const L=document.getElementById('loader');
  if(!L||!window.navigation||typeof navigation.navigate!=='function')return;
  let finish=null,running=false;
  const shown=()=>!L.hidden;
  navigation.addEventListener('navigate',e=>{
    if(e.info!=='tiada-loading'||!e.canIntercept)return;
    e.intercept({scroll:'manual',focusReset:'manual',handler:()=>new Promise(res=>{
      finish=res;if(!shown())res();
      setTimeout(res,20000); // never spin forever
    })});
  });
  function start(){
    if(running)return;running=true;
    try{const r=navigation.navigate(location.href,{history:'replace',info:'tiada-loading'});
      Promise.resolve(r&&r.finished).catch(()=>{}).then(()=>{running=false;finish=null;if(shown())start()})}
    catch(_){running=false}
  }
  new MutationObserver(()=>{if(shown())start();else if(finish){finish();}}).observe(L,{attributes:true,attributeFilter:['hidden']});
  if(shown())start();
})();
