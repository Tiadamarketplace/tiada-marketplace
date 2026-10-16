/* ===================== 2026 redesign layer for the admin desk (Figma · 03 Admin) ===================== */

/* dashboard: gold strip for paid orders waiting to be packed, red low-stock number */
function vDash(){
  const fresh=S.orders.filter(o=>o.status==='new');
  const ids=fresh.slice(0,3).map(o=>o.id).join(', ')+(fresh.length>3?'…':'');
  const strip=fresh.length?`<div class="dash-alert" role="status">${ic('bell',18)}<span>${fresh.length} new paid order${fresh.length>1?'s':''} waiting to be packed — ${esc(ids)}</span><button class="btn sm" data-view="orders">Open orders</button></div>`:'';
  let html=vDashLive();
  if(lowStock().length+S.products.filter(p=>p.status==='out').length)html=html.replace('<div class="card kpi"><small>Low or sold out</small>','<div class="card kpi bad"><small>Low or sold out</small>');
  return strip+html;
}
