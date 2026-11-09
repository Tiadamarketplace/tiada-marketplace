'use client';
import type { Ctx } from './Desk';
import { naira, card, Btn, ago } from './ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const lagosDay = (t: number) => new Date(t + 3600e3).toISOString().slice(0, 10);

export default function Today({ c }: { c: Ctx }) {
  const { d, go } = c;
  const now = d.now || Date.now();
  const paid = d.orders.filter(o => !['refunded', 'cancelled'].includes(o.status));
  const dayKey = (iso: string | null) => (iso ? lagosDay(Date.parse(iso)) : '');
  const today = lagosDay(now);
  const days = Array.from({ length: 14 }, (_, i) => lagosDay(now - (13 - i) * 864e5));
  const byDay = days.map(k => paid.filter(o => dayKey(o.paid_at || o.created_at) === k));
  const sales = byDay.map(l => l.reduce((a, o) => a + o.total, 0));
  const todaySales = sales[13], week = sales.slice(7).reduce((a, b) => a + b, 0), lastWeek = sales.slice(0, 7).reduce((a, b) => a + b, 0);
  const toPack = d.orders.filter(o => o.status === 'new');
  const issues = d.orders.filter(o => o.status === 'issue');
  const onWay = d.orders.filter(o => o.status === 'route');
  const pendingReviews = d.reviews.filter(r => r.status === 'pending').length;
  const waitingChat = d.chats.filter(ch => ch.status === 'waiting').length;
  const unread = d.contact.filter(m => !m.handled).length;
  const low = d.products.filter(p => !p.hidden && p.sizes.some(s => !s.na && s.stock != null && s.stock <= (p.low || 3)));
  const waitingPeople = Object.values(d.waiting).reduce((a, b) => a + b, 0);
  const hour = new Date(now + 3600e3).getUTCHours();
  const hello = `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${d.me.name.split(' ')[0]}.`;
  const dateLine = new Date(now + 3600e3).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  const spark = (vals: number[]) => { const m = Math.max(1, ...vals); return vals.map((v, i) => ({ h: Math.max(8, (v / m) * 100), c: i === vals.length - 1 ? '#D49B41' : '#DCE6DF' })); };
  const trend = (a: number, b: number) => (!b ? (a ? 'New this week' : 'No sales yet') : `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}% on last week`);
  const kpis = [
    { label: 'Sales today', value: naira(todaySales), spark: spark(sales.slice(7)), trend: `${byDay[13].length} paid order${byDay[13].length === 1 ? '' : 's'}`, color: '#66736B', go: () => go('orders') },
    { label: 'To pack', value: String(toPack.length), spark: spark(byDay.slice(7).map(l => l.length)), trend: toPack.length ? `Oldest ${ago(toPack[toPack.length - 1].paid_at || toPack[toPack.length - 1].created_at)}` : 'All packed', color: toPack.length ? '#8A5F1C' : '#0B3A23', go: () => go('orders') },
    { label: 'This week', value: naira(week), spark: spark(sales.slice(7)), trend: trend(week, lastWeek), color: week >= lastWeek ? '#0B3A23' : '#9E3522', go: () => go('orders') },
    { label: 'Customers', value: String(d.customers.length), spark: spark(days.slice(7).map(k => d.customers.filter(cu => dayKey(cu.created_at) === k).length)), trend: `${d.subscribers} on the email list`, color: '#66736B', go: () => go('customers') },
  ];
  const todo = [
    toPack.length && { n: toPack.length, tint: '#F6E9CF', col: '#8A5F1C', t: `Pack ${toPack.length} order${toPack.length === 1 ? '' : 's'}`, s: 'Paid and waiting for you', cta: 'Start packing', go: () => go('orders') },
    issues.length && { n: issues.length, tint: '#FBEFEB', col: '#9E3522', t: `Sort ${issues.length} problem order${issues.length === 1 ? '' : 's'}`, s: issues.map(o => o.id).slice(0, 3).join(', '), cta: 'Open', go: () => go('orders', 'orders=issue') },
    waitingChat && { n: waitingChat, tint: '#F6E9CF', col: '#8A5F1C', t: `${waitingChat} customer${waitingChat === 1 ? ' is' : 's are'} waiting in chat`, s: 'They asked to talk to a person', cta: 'Reply', go: () => go('chat') },
    onWay.length && { n: onWay.length, tint: '#E6EEE8', col: '#0B3A23', t: `${onWay.length} on the way`, s: 'Mark them delivered when the rider confirms', cta: 'Run sheet', go: () => go('orders', 'orders=route') },
    unread && { n: unread, tint: '#EEF0F5', col: '#20456B', t: `${unread} website message${unread === 1 ? '' : 's'}`, s: 'From the Contact us form', cta: 'Read', go: () => go('messages') },
    pendingReviews && { n: pendingReviews, tint: '#EEF0F5', col: '#20456B', t: `${pendingReviews} review${pendingReviews === 1 ? '' : 's'} to check`, s: 'Approve them to show in the shop', cta: 'Check', go: () => go('reviews') },
    low.length && { n: low.length, tint: '#FBEFEB', col: '#9E3522', t: `${low.length} product${low.length === 1 ? '' : 's'} running low`, s: waitingPeople ? `${waitingPeople} people asked to be told when items are back` : low.slice(0, 3).map(p => p.name).join(', '), cta: 'Restock', go: () => go('products', 'products=low') },
  ].filter(Boolean) as { n: number; tint: string; col: string; t: string; s: string; cta: string; go: () => void }[];

  // delivery runs: orders still to go out, grouped by their area's day
  const zoneOf = (id: string | null) => d.zones.find(z => z.id === id);
  const runMap: Record<string, { day: string; areas: Set<string>; n: number; kg: number }> = {};
  for (const o of d.orders.filter(x => x.status === 'new' || x.status === 'packed')) {
    const z = zoneOf(o.zone_id); const day = z?.state ? 'Courier' : o.speed === 'same' ? 'Priority' : z?.day || 'Unscheduled';
    const r = (runMap[day] ||= { day, areas: new Set(), n: 0, kg: 0 }); r.n++; r.kg += Number(o.kg) || 0; r.areas.add(o.area_label || '');
  }
  const todayIdx = new Date(now + 3600e3).getUTCDay();
  const order = (day: string) => { const i = DAYS.indexOf(day); return day === 'Priority' ? -1 : i < 0 ? 99 : (i - todayIdx + 7) % 7; };
  const runs = Object.values(runMap).sort((a, b) => order(a.day) - order(b.day));

  // best sellers in the last 30 days
  const since = now - 30 * 864e5; const tally: Record<string, { name: string; qty: number; amt: number }> = {};
  for (const o of paid.filter(x => Date.parse(x.paid_at || x.created_at) > since)) for (const it of o.items) { const k = it.pid || it.name; const t = (tally[k] ||= { name: it.name, qty: 0, amt: 0 }); t.qty += it.qty; t.amt += it.qty * it.price; }
  const best = Object.values(tally).sort((a, b) => b.amt - a.amt).slice(0, 5);
  const maxSale = Math.max(1, ...sales);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A5F1C' }}>{dateLine}</p>
        <h1 className="hello serif" style={{ margin: '8px 0 0', fontWeight: 500, fontSize: 40, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{hello}</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14.5, color: '#4D5A52' }}>{todo.length ? `${todo.length} thing${todo.length === 1 ? '' : 's'} need${todo.length === 1 ? 's' : ''} you today.` : 'Nothing is waiting on you. Nice.'}</p>
      </div>
      {d.testMode && <div style={{ padding: '12px 16px', borderRadius: 12, background: '#FBF2DE', color: '#5C430F', fontSize: 13.5, lineHeight: 1.55 }}><strong>Paystack is in test mode.</strong> Customers can’t pay with real money yet. Put your live keys in Vercel when you’re ready to open.</div>}

      <div className="kgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        {kpis.map(k => (
          <button key={k.label} type="button" className="ub lift" onClick={k.go} style={{ ...card, padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#66736B' }}>{k.label}</span>
            <span style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{k.value}</span>
              <span aria-hidden="true" className="adesk" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 30 }}>{k.spark.map((s, i) => <span key={i} style={{ width: 5, height: s.h + '%', borderRadius: 2, background: s.c }} />)}</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: k.color }}>{k.trend}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        <section style={{ ...card, flex: '999 1 540px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '20px 22px 12px' }}><h2 style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Your to-do</h2><span style={{ fontSize: 12.5, color: '#66736B' }}>{todo.length} open</span></div>
          {todo.map(t => (
            <div key={t.t} className="tdrow" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderTop: '1px solid #F0ECE3' }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: t.tint, color: t.col, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 15, fontWeight: 700 }}>{t.n}</span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{t.t}</span><span style={{ fontSize: 12.5, color: '#66736B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.s}</span></span>
              <Btn kind="out" small onClick={t.go}>{t.cta}</Btn>
            </div>
          ))}
          {!todo.length && <div style={{ padding: '34px 22px', borderTop: '1px solid #F0ECE3', textAlign: 'center' }}><p className="serif" style={{ margin: 0, fontSize: 22, color: '#0B3A23' }}>All caught up.</p><p style={{ margin: '6px 0 0', fontSize: 13, color: '#66736B' }}>New orders will chime and show up here.</p></div>}
        </section>
        <section style={{ ...card, flex: '1 1 320px', minWidth: 0, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}><h2 style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Delivery runs</h2><button type="button" className="ub lnk" onClick={() => go('orders')} style={{ fontSize: 12.5, fontWeight: 600 }}>All orders</button></div>
          {runs.map(r => (
            <button key={r.day} type="button" className="ub tdrow" onClick={() => go('orders', 'orders=run:' + r.day)} style={{ width: '100%', marginTop: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid #F0ECE3', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 46, flex: 'none', textAlign: 'center', lineHeight: 1.1 }}><span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A5F1C' }}>{r.day.slice(0, 3)}</span><span className="serif" style={{ display: 'block', fontSize: 22, color: '#0B3A23' }}>{r.n}</span></span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.day === 'Courier' ? 'Courier (outside Lagos)' : r.day === 'Priority' ? 'Priority (today)' : r.day + ' run'}</span><span style={{ fontSize: 12, color: '#66736B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{Array.from(r.areas).join(', ')}</span></span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4D5A52' }}>{Math.round(r.kg * 10) / 10} kg</span>
            </button>
          ))}
          {!runs.length && <p style={{ margin: '14px 0 0', fontSize: 13.5, color: '#66736B' }}>No orders waiting to go out.</p>}
        </section>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        <section style={{ ...card, flex: '999 1 540px', minWidth: 0, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}><h2 style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Sales, last 14 days</h2><span style={{ fontSize: 12.5, color: '#66736B' }}>{naira(sales.reduce((a, b) => a + b, 0))}</span></div>
          <div role="img" aria-label={`Daily sales for the last 14 days. Today ${naira(todaySales)}.`} style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, marginTop: 18 }}>
            {sales.map((v, i) => (
              <div key={i} title={`${new Date(days[i]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${naira(v)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ width: '100%', maxWidth: 30, height: `${Math.max(2, (v / maxSale) * 100)}%`, borderRadius: '5px 5px 2px 2px', background: days[i] === today ? '#D49B41' : '#0B3A23', opacity: v ? 1 : 0.18 }} />
                <span style={{ fontSize: 10.5, color: '#8B958E' }}>{new Date(days[i]).getUTCDate()}</span>
              </div>
            ))}
          </div>
        </section>
        <section style={{ ...card, flex: '1 1 320px', minWidth: 0, padding: '20px 22px' }}>
          <h2 style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Best sellers, 30 days</h2>
          {best.map((b, i) => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < best.length - 1 ? '1px solid #F0ECE3' : 0 }}>
              <span className="serif" style={{ width: 22, fontSize: 18, color: '#D49B41' }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.name}</span><span style={{ fontSize: 12, color: '#66736B' }}>{b.qty} sold</span></span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{naira(b.amt)}</span>
            </div>
          ))}
          {!best.length && <p style={{ margin: '14px 0 0', fontSize: 13.5, color: '#66736B' }}>Best sellers show here after your first orders.</p>}
        </section>
      </div>
    </div>
  );
}
