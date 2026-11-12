'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toasts, useToast, call, chime, naira, input, lab, Btn, ago } from './ui';
import type { Data, Sec } from './types';
import Today from './Today';
import Orders from './Orders';
import Products from './Products';
import Banners from './Banners';
import Discounts from './Discounts';
import Emails from './Emails';
import Reviews from './Reviews';
import ChatDesk from './ChatDesk';
import Customers from './Customers';
import Messages from './Messages';
import Settings from './Settings';
import Delivery from './Delivery';
import Guide from './Guide';
import Team from './Team';

export type Ctx = { d: Data; reload: () => Promise<void>; go: (s: Sec, extra?: string) => void; hash: string; setD: React.Dispatch<React.SetStateAction<Data | null>> };

const NAV: [string, [Sec, string, string][]][] = [
  ['Help', [['guide', 'How to use', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01']]],
  ['Run the shop', [['dash', 'Today', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z'], ['orders', 'Orders', 'M6 4h12l1 16H5zM9 8a3 3 0 0 0 6 0'], ['products', 'Products', 'M4 8l8-4 8 4-8 4zM4 8v8l8 4 8-4V8M12 12v8']]],
  ['Sell more', [['banners', 'Banners', 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6'], ['discounts', 'Discount codes', 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01'], ['emails', 'Emails', 'M3 6h18v12H3zM3 7l9 6 9-6'], ['reviews', 'Reviews', 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z']]],
  ['Customers', [['chat', 'Chat', 'M5 5h14v10H9l-4 4z'], ['messages', 'Website messages', 'M4 4h16v13H7l-3 3zM8 9h8M8 12h5'], ['customers', 'Customers', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c.8-3.8 3.6-6 7-6s6.2 2.2 7 6M17 11a3 3 0 1 0 0-6M22 21c-.5-2.6-2-4.4-4-5.2']]],
  ['Settings', [['settings', 'Shop settings', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.4 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.1 13.9H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z'], ['delivery', 'Delivery', 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 18.5h.01M17 18.5h.01'], ['team', 'Team & security', 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z']]],
];
const TITLES: Record<Sec, [string, string]> = {
  dash: ['Today', ''], orders: ['Orders', 'Pack, send and deliver. Customers get an email at each step.'], products: ['Products', 'Prices, sizes and stock for each size. Changes show in the shop within a minute.'],
  banners: ['Banners', 'The slides in the middle of the home page. Each one can link to a product, an aisle or any page.'], discounts: ['Discount codes', 'Codes customers type at checkout.'],
  emails: ['Emails', 'Send news, deals or a restock note to your customers.'], reviews: ['Reviews', 'Reviews only show in the shop after you approve them.'], chat: ['Chat', 'Customers who asked to talk to a person.'],
  messages: ['Website messages', 'Sent from the Contact us form on the Help page.'], customers: ['Customers', 'Everyone who has an account or has ordered.'],
  settings: ['Shop settings', 'Business details, opening hours, alerts and policies.'], delivery: ['Delivery', 'Fees by distance from your pins in Lagos and Oyo.'], team: ['Team & security', 'Who can open this desk, and what they’ve done.'],
  guide: ['How to use', 'Every page of this desk explained, step by step.'],
};

export default function Desk() { return <Toasts><Inner /></Toasts>; }

function Inner() {
  const toast = useToast();
  const [me, setMe] = useState<'loading' | 'out' | 'in'>('loading');
  const [d, setD] = useState<Data | null>(null);
  const [hash, setHash] = useState('');
  const [nav, setNav] = useState(false);
  const [q, setQ] = useState('');
  const [qOpen, setQOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const known = useRef<Set<string> | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const head = hash.split(/[=&]/)[0] || 'dash';
  const ALIAS: Record<string, Sec> = { order: 'orders', product: 'products', banner: 'banners', discount: 'discounts', chat: 'chat' };
  const sec: Sec = head in TITLES ? (head as Sec) : ALIAS[head] || 'dash';

  useEffect(() => { const f = () => setHash(decodeURIComponent(location.hash.slice(1))); f(); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  const go = useCallback((s: Sec, extra = '') => { location.hash = s === 'dash' && !extra ? '' : extra || s; setNav(false); setQ(''); setQOpen(false); window.scrollTo({ top: 0 }); }, []);

  const reload = useCallback(async () => {
    try {
      const r = await call<Data>('/api/admin/data');
      // new paid order since we last looked: chime and say so
      const ids = new Set(r.orders.map(o => o.id));
      if (known.current) {
        const fresh = r.orders.filter(o => !known.current!.has(o.id) && o.status === 'new');
        if (fresh.length) { if (r.settings.alerts?.sound !== false) chime(); toast('ok', fresh.length === 1 ? `New order ${fresh[0].id}` : `${fresh.length} new orders`, fresh.length === 1 ? `${naira(fresh[0].total)} from ${fresh[0].name.split(' ')[0]}.` : '', { label: 'Open', fn: () => go('orders', 'order=' + fresh[0].id) }); }
      }
      known.current = ids;
      setD(r); setMe('in');
    } catch (e) { if ((e as { status?: number }).status === 401 || (e as { status?: number }).status === 403) setMe('out'); else toast('err', 'Couldn’t load the desk.', (e as Error).message); }
  }, [toast, go]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (me !== 'in') return; const t = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, 30000); return () => clearInterval(t); }, [me, reload]);
  // lock the desk after 15 minutes without a click or key
  useEffect(() => {
    if (me !== 'in') return;
    let t: ReturnType<typeof setTimeout>;
    const reset = () => { clearTimeout(t); t = setTimeout(async () => { await call('/api/admin/logout?idle=1', {}).catch(() => null); setMe('out'); setD(null); }, 15 * 60000); };
    reset(); ['click', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, reset));
    return () => { clearTimeout(t); ['click', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, reset)); };
  }, [me]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) { e.preventDefault(); search.current?.focus(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!t || !d) return [];
    const out: { label: string; items: { title: string; sub: string; go: () => void }[] }[] = [];
    const os = d.orders.filter(o => `${o.id} ${o.name} ${o.phone} ${o.email}`.toLowerCase().includes(t)).slice(0, 5).map(o => ({ title: `${o.id} · ${o.name}`, sub: `${naira(o.total)} · ${o.items.map(i => i.qty + ' × ' + i.name).join(', ')}`, go: () => go('orders', 'order=' + o.id) }));
    const ps = d.products.filter(p => p.name.toLowerCase().includes(t)).slice(0, 5).map(p => ({ title: p.name, sub: `${p.stock} in stock${p.hidden ? ' · hidden' : ''}`, go: () => go('products', 'product=' + p.id) }));
    const cs = d.customers.filter(c => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(t)).slice(0, 4).map(c => ({ title: c.name || c.email, sub: c.email, go: () => go('customers', 'customers=' + c.id) }));
    if (os.length) out.push({ label: 'Orders', items: os }); if (ps.length) out.push({ label: 'Products', items: ps }); if (cs.length) out.push({ label: 'Customers', items: cs });
    return out;
  }, [q, d, go]);

  if (me === 'loading') return <div className="adm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #E6E0D2', borderTopColor: '#0B3A23', animation: 'spin .9s linear infinite' }} /></div>;
  if (me === 'out' || !d) return <Login onIn={() => { setMe('loading'); reload(); }} />;

  const badges: Partial<Record<Sec, number>> = {
    orders: d.orders.filter(o => o.status === 'new' || o.status === 'issue').length,
    reviews: d.reviews.filter(r => r.status === 'pending').length,
    chat: d.chats.filter(c => c.status === 'waiting').length,
    messages: d.contact.filter(m => !m.handled).length,
  };
  const lowCount = d.products.filter(p => !p.hidden && p.sizes.some(s => !s.na && s.stock != null && s.stock <= (p.low || 3))).length;
  const bells = [
    ...(badges.chat ? [{ t: `${badges.chat} waiting in chat`, s: 'Customers asked for a person', go: () => go('chat'), hot: true }] : []),
    ...(d.orders.filter(o => o.status === 'new').length ? [{ t: `${d.orders.filter(o => o.status === 'new').length} orders to pack`, s: 'Paid and waiting', go: () => go('orders'), hot: true }] : []),
    ...(d.orders.filter(o => o.status === 'issue').length ? [{ t: `${d.orders.filter(o => o.status === 'issue').length} orders with a problem`, s: 'Need sorting', go: () => go('orders', 'orders=issue'), hot: true }] : []),
    ...(badges.reviews ? [{ t: `${badges.reviews} reviews to check`, s: 'Approve or hide', go: () => go('reviews'), hot: false }] : []),
    ...(badges.messages ? [{ t: `${badges.messages} website messages`, s: 'From the contact form', go: () => go('messages'), hot: false }] : []),
    ...(lowCount ? [{ t: `${lowCount} products running low`, s: 'Restock soon', go: () => go('products', 'products=low'), hot: false }] : []),
  ];
  const ctx: Ctx = { d, reload, go, hash, setD };
  const [title, sub] = TITLES[sec];
  const signOut = async () => { await call('/api/admin/logout', {}).catch(() => null); setMe('out'); setD(null); };

  return (
    <div className="adm">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {nav && <div className="scrim amob" onClick={() => setNav(false)} style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(17,32,23,0.45)' }} />}
        <aside className={'anav thin' + (nav ? ' open' : '')} aria-label="Admin menu" style={{ position: 'sticky', top: 0, height: '100vh', width: 256, flex: 'none', background: '#0B3A23', color: 'rgba(236,241,237,0.78)', display: 'flex', flexDirection: 'column', padding: '18px 14px 16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 6px 18px' }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: '#FBF9F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><img src="/logo-icon.png" alt="" style={{ height: 36, width: 'auto' }} /></span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}><span className="serif" style={{ fontSize: 19, color: '#FFFFFF' }}>Tiada</span><span style={{ fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D49B41' }}>Admin desk</span></span>
            <button type="button" className="ub amob" aria-label="Close menu" onClick={() => setNav(false)} style={{ marginLeft: 'auto', width: 36, height: 36, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>✕</button>
          </div>
          {NAV.map(([g, items]) => (
            <div key={g}>
              <div style={{ padding: '14px 10px 6px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(236,241,237,0.42)' }}>{g}</div>
              {items.map(([id, l, icon]) => { const on = sec === id; const n = badges[id] || 0; const hot = id === 'orders' || id === 'chat'; return (
                <button key={id} type="button" className="ub navi" aria-current={on ? 'page' : undefined} onClick={() => go(id)} style={{ width: '100%', minHeight: 40, padding: '0 10px', marginBottom: 2, borderRadius: 9, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5, fontWeight: on ? 600 : 500, color: on ? '#0B3A23' : 'rgba(236,241,237,0.78)', background: on ? '#FBF9F4' : 'transparent' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
                  <span style={{ flex: 1, textAlign: 'left' }}>{l}</span>
                  {n > 0 && <span style={{ minWidth: 22, height: 20, padding: '0 7px', borderRadius: 999, background: hot ? '#D49B41' : on ? '#0B3A23' : 'rgba(255,255,255,0.14)', color: hot ? '#0B3A23' : '#FFFFFF', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>}
                </button>); })}
            </div>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.testMode ? '#E9B969' : '#5FD08A', flex: 'none', boxShadow: `0 0 0 4px ${d.testMode ? 'rgba(233,185,105,.18)' : 'rgba(95,208,138,.18)'}` }} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}><span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{d.testMode ? 'Paystack test mode' : 'Taking real payments'}</span><span style={{ fontSize: 11.5 }}>{d.testMode ? 'No real money moves yet' : 'Paystack is live'}</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 0 6px' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#D49B41', color: '#0B3A23', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{d.me.name[0]}</span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}><span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.me.name}</span><span style={{ fontSize: 11.5 }}>{d.me.role}</span></span>
              <button type="button" className="ub navi" aria-label="Sign out" title="Sign out" onClick={signOut} style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" /></svg></button>
            </div>
          </div>
        </aside>

        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header className="topbar" style={{ position: 'sticky', top: 0, zIndex: 60, background: 'rgba(246,244,239,0.9)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid #E9E4D9' }}>
            <div style={{ maxWidth: 1320, margin: '0 auto', padding: '12px clamp(14px, 3vw, 36px)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="ub amob qbtn" aria-label="Open menu" onClick={() => setNav(true)} style={{ width: 42, height: 42, borderRadius: 10, border: '1px solid #E4DFD3', background: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>☰</button>
              <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: 560, minWidth: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 12px 0 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E4DFD3' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#66736B" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
                  <input ref={search} type="search" value={q} onChange={e => { setQ(e.target.value); setQOpen(true); }} onFocus={() => setQOpen(true)} onBlur={() => setTimeout(() => setQOpen(false), 150)} onKeyDown={e => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } if (e.key === 'Enter' && results[0]) results[0].items[0].go(); }}
                    aria-label="Search orders, products and customers" placeholder="Search orders, products, customers" style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontSize: 14 }} />
                  <span className="adesk" style={{ fontSize: 11, fontWeight: 600, color: '#8B958E', border: '1px solid #E4DFD3', borderRadius: 5, padding: '2px 6px' }}>/</span>
                </label>
                {qOpen && q.trim() && (
                  <div className="menu-in" role="listbox" style={{ position: 'absolute', left: 0, right: 0, top: 50, background: '#FFFFFF', border: '1px solid #ECE8DF', borderRadius: 14, boxShadow: '0 24px 60px rgba(17,32,23,0.16)', padding: 8, maxHeight: '70vh', overflowY: 'auto' }}>
                    {results.map(g => <div key={g.label}><div style={{ padding: '10px 10px 4px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8B958E' }}>{g.label}</div>
                      {g.items.map((it, i) => <button key={i} type="button" role="option" aria-selected="false" className="ub tdrow" onMouseDown={e => e.preventDefault()} onClick={it.go} style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '9px 10px', borderRadius: 8 }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{it.title}</span><span style={{ fontSize: 12, color: '#66736B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sub}</span></button>)}</div>)}
                    {!results.length && <p style={{ margin: 0, padding: '18px 10px', textAlign: 'center', fontSize: 13.5, color: '#66736B' }}>Nothing matches “{q.trim()}”.</p>}
                  </div>
                )}
              </div>
              <span style={{ flex: '1 1 0' }} />
              {d.testMode && <span className="adesk" style={{ padding: '6px 10px', borderRadius: 999, background: '#F6E9CF', color: '#8A5F1C', fontSize: 11, fontWeight: 700 }}>Test mode</span>}
              <a href="/" target="_blank" rel="noopener" className="ub qbtn adesk" style={{ height: 42, padding: '0 14px', borderRadius: 10, border: '1px solid #E4DFD3', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: '#1F2A23', textDecoration: 'none' }}>View shop ↗</a>
              <div style={{ position: 'relative' }}>
                <button type="button" className="ub qbtn" aria-label={`Notifications${bells.length ? ', ' + bells.length : ''}`} aria-expanded={bell} onClick={() => { setBell(!bell); setNewMenu(false); }} style={{ width: 42, height: 42, borderRadius: 10, border: '1px solid #E4DFD3', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2A23" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" /></svg>
                  {bells.some(b => b.hot) && <span className="pulse" style={{ position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: '50%', background: '#D49B41', border: '2px solid #FFFFFF' }} />}
                </button>
                {bell && (
                  <div className="menu-in" style={{ position: 'absolute', right: 0, top: 50, width: 'min(330px, calc(100vw - 24px))', background: '#FFFFFF', border: '1px solid #ECE8DF', borderRadius: 14, boxShadow: '0 24px 60px rgba(17,32,23,0.16)', padding: 6, zIndex: 5 }}>
                    <div style={{ padding: '10px 12px 6px', fontSize: 13.5, fontWeight: 600 }}>Needs you</div>
                    {bells.map((b, i) => <button key={i} type="button" className="ub tdrow" onClick={() => { setBell(false); b.go(); }} style={{ width: '100%', display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8, textAlign: 'left' }}><span style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: b.hot ? '#D49B41' : '#C9CFC9', flex: 'none' }} /><span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.t}</span><span style={{ fontSize: 12, color: '#66736B' }}>{b.s}</span></span></button>)}
                    {!bells.length && <p style={{ margin: 0, padding: '14px 12px 16px', fontSize: 13.5, color: '#66736B' }}>Nothing needs you right now.</p>}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button type="button" className="ub btn-solid press" aria-haspopup="menu" aria-expanded={newMenu} onClick={() => { setNewMenu(!newMenu); setBell(false); }} style={{ height: 42, padding: '0 16px', borderRadius: 10, background: '#0B3A23', color: '#FFFFFF', fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>+ <span className="adesk">New</span></button>
                {newMenu && (
                  <div className="menu-in" role="menu" style={{ position: 'absolute', right: 0, top: 50, width: 250, background: '#FFFFFF', border: '1px solid #ECE8DF', borderRadius: 14, boxShadow: '0 24px 60px rgba(17,32,23,0.16)', padding: 6, zIndex: 5 }}>
                    {([['Add a product', 'Name, sizes, prices and photo', () => go('products', 'product=new')], ['Add a banner', 'A new slide for the home page', () => go('banners', 'banner=new')], ['Create a discount code', 'For checkout', () => go('discounts', 'discount=new')], ['Email your customers', 'News, deals or a restock', () => go('emails')]] as [string, string, () => void][]).map(([l, s, fn]) => (
                      <button key={l} type="button" role="menuitem" className="ub tdrow" onClick={() => { setNewMenu(false); fn(); }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1, padding: '10px 12px', borderRadius: 8 }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12, color: '#66736B' }}>{s}</span></button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>
          <main style={{ flex: 1, width: '100%', maxWidth: 1320, margin: '0 auto', minWidth: 0, padding: '28px clamp(14px, 3vw, 36px) 90px' }}>
            {sec !== 'dash' && <div style={{ marginBottom: 22 }}><h1 style={{ margin: 0, fontWeight: 500, fontSize: 'clamp(24px, 3vw, 30px)', letterSpacing: '-0.02em' }}>{title}</h1>{sub && <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#66736B', maxWidth: 620, lineHeight: 1.55 }}>{sub}</p>}</div>}
            <div key={sec} className="fade">
              {sec === 'dash' && <Today c={ctx} />}
              {sec === 'orders' && <Orders c={ctx} />}
              {sec === 'products' && <Products c={ctx} />}
              {sec === 'banners' && <Banners c={ctx} />}
              {sec === 'discounts' && <Discounts c={ctx} />}
              {sec === 'emails' && <Emails c={ctx} />}
              {sec === 'reviews' && <Reviews c={ctx} />}
              {sec === 'chat' && <ChatDesk c={ctx} />}
              {sec === 'messages' && <Messages c={ctx} />}
              {sec === 'customers' && <Customers c={ctx} />}
              {sec === 'settings' && <Settings c={ctx} />}
              {sec === 'delivery' && <Delivery c={ctx} />}
              {sec === 'team' && <Team c={ctx} />}
              {sec === 'guide' && <Guide c={ctx} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Login({ onIn }: { onIn: () => void }) {
  type Step = 'pw' | 'code' | 'forgot' | 'setup' | 'setupCode' | 'reset' | 'resetCode';
  const [step, setStep] = useState<Step>('pw');
  const [f, setF] = useState({ email: '', pw: '', code: '', name: '', key: '', lost: false });
  const [ticket, setTicket] = useState(''); const [qr, setQr] = useState<{ qr: string; secret: string } | null>(null);
  const [err, setErr] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState('');
  useEffect(() => {
    const h = location.hash.slice(1);
    if (h.startsWith('reset=')) { setResetToken(h.slice(6)); setStep('reset'); return; }
    call<{ needed: boolean }>('/api/admin/setup').then(r => { if (r.needed) setStep('setup'); }).catch(() => null);
  }, []);
  const set = (k: keyof typeof f, v: string | boolean) => setF(x => ({ ...x, [k]: v }));
  const run = async (fn: () => Promise<void>) => { setErr(''); setBusy(true); try { await fn(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const code = f.code.replace(/\s/g, '');
  const submit = () => run(async () => {
    if (step === 'pw') { const r = await call<{ ticket: string }>('/api/admin/login', { step: 'pw', email: f.email, password: f.pw }); setTicket(r.ticket); setStep('code'); }
    else if (step === 'code') { await call('/api/admin/login', { step: 'code', ticket, code }); onIn(); }
    else if (step === 'forgot') { await call('/api/admin/reset', { action: 'request', email: f.email }); setNote('If that email belongs to a staff account, a reset link is on its way. It works for 30 minutes.'); }
    else if (step === 'setup') { const r = await call<{ ticket: string; qr: string; secret: string }>('/api/admin/setup', { action: 'start', token: f.key, name: f.name, email: f.email, password: f.pw }); setTicket(r.ticket); setQr(r); setStep('setupCode'); set('code', ''); }
    else if (step === 'setupCode') { await call('/api/admin/setup', { action: 'finish', ticket, code }); onIn(); }
    else if (step === 'reset') {
      const r = await call<{ done?: boolean; ticket?: string; qr?: string; secret?: string }>('/api/admin/reset', { action: 'finish', token: resetToken, password: f.pw, ...(f.lost ? { setupKey: f.key } : { code }) });
      if (r.ticket) { setTicket(r.ticket); setQr({ qr: r.qr!, secret: r.secret! }); setStep('resetCode'); set('code', ''); }
      else { history.replaceState(null, '', '/admin'); setNote('Password changed. Sign in with your new password.'); setStep('pw'); set('pw', ''); set('code', ''); }
    } else if (step === 'resetCode') { await call('/api/admin/reset', { action: 'confirm', ticket, code }); history.replaceState(null, '', '/admin'); setNote('All set. Sign in with your new password and the new code.'); setStep('pw'); setQr(null); set('pw', ''); set('code', ''); }
  });
  const T: Record<Step, [string, string, string]> = {
    pw: ['Admin desk', 'Sign in to run the shop.', 'Continue'], code: ['One more step', 'Enter the 6-digit code from your authenticator app.', 'Verify and open desk'],
    forgot: ['Reset your password', 'We’ll email you a link that works for 30 minutes.', 'Email me a reset link'],
    setup: ['Set up the owner account', 'First time here. Use the SETUP_TOKEN from Vercel to create your account.', 'Continue'],
    setupCode: ['Link your authenticator', 'Scan this with Google Authenticator or Microsoft Authenticator, then enter the code it shows.', 'Finish setup'],
    reset: ['Choose a new password', f.lost ? 'Lost your phone too? Owners can use the SETUP_TOKEN from Vercel.' : 'You’ll also need the code from your authenticator app.', 'Save new password'],
    resetCode: ['Link your new authenticator', 'Scan this, then enter the code it shows.', 'Finish'],
  };
  const codeBox = <label style={lab}>6-digit code<input inputMode="numeric" autoComplete="one-time-code" placeholder="000 000" value={f.code} onChange={e => set('code', e.target.value)} autoFocus style={{ ...input, height: 56, fontSize: 24, letterSpacing: '0.3em', textAlign: 'center' }} /></label>;
  return (
    <div className="adm fade" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0B3A23' }}>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ width: 'min(420px, 100%)', background: '#FFFFFF', borderRadius: 14, padding: 34, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <img src="/logo-sm.png" alt="Tiada Marketplace" style={{ height: 66, width: 'auto', alignSelf: 'center' }} />
        <div style={{ textAlign: 'center' }}><h1 style={{ margin: 0, fontWeight: 500, fontSize: 24 }}>{T[step][0]}</h1><p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#66736B', lineHeight: 1.55 }}>{T[step][1]}</p></div>
        {step === 'setup' && <label style={lab}>Your name<input value={f.name} onChange={e => set('name', e.target.value)} autoComplete="name" style={{ ...input, height: 48 }} /></label>}
        {(step === 'pw' || step === 'forgot' || step === 'setup') && <label style={lab}>Email<input type="email" autoComplete="username" value={f.email} onChange={e => set('email', e.target.value)} autoFocus={step !== 'setup'} style={{ ...input, height: 48 }} /></label>}
        {(step === 'pw' || step === 'setup' || step === 'reset') && <label style={lab}>{step === 'pw' ? 'Password' : 'New password (10+ characters)'}<input type="password" autoComplete={step === 'pw' ? 'current-password' : 'new-password'} value={f.pw} onChange={e => set('pw', e.target.value)} style={{ ...input, height: 48 }} /></label>}
        {(step === 'setup' || (step === 'reset' && f.lost)) && <label style={lab}>Setup key (SETUP_TOKEN in Vercel)<input type="password" value={f.key} onChange={e => set('key', e.target.value)} autoComplete="off" style={{ ...input, height: 48 }} /></label>}
        {(step === 'setupCode' || step === 'resetCode') && qr && <div style={{ textAlign: 'center' }}><img src={qr.qr} alt="QR code for your authenticator app" width={200} height={200} style={{ borderRadius: 8 }} /><p style={{ margin: '6px 0 0', fontSize: 12, color: '#66736B', wordBreak: 'break-all' }}>Can’t scan? Type this key: <strong>{qr.secret}</strong></p></div>}
        {(step === 'code' || step === 'setupCode' || step === 'resetCode' || (step === 'reset' && !f.lost)) && codeBox}
        {step === 'reset' && <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" checked={f.lost} onChange={e => set('lost', e.target.checked)} />I lost my authenticator too (owner only)</label>}
        {err && <p role="alert" style={{ margin: 0, padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5 }}>{err}</p>}
        {note && <p role="status" style={{ margin: 0, padding: '10px 12px', borderRadius: 8, background: '#E6EEE8', color: '#0B3A23', fontSize: 13.5 }}>{note}</p>}
        <Btn type="submit" disabled={busy} style={{ height: 50, fontSize: 15 }}>{busy ? 'One moment…' : T[step][2]}</Btn>
        {(step === 'pw' || step === 'forgot' || step === 'code') && <button type="button" className="ub lnk" onClick={() => { setErr(''); setNote(''); setStep(step === 'pw' ? 'forgot' : 'pw'); }} style={{ alignSelf: 'center', fontSize: 13, minHeight: 32 }}>{step === 'pw' ? 'Forgot your password?' : 'Back to sign in'}</button>}
      </form>
    </div>
  );
}
export { ago };
