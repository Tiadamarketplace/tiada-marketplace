'use client';
import Link from '@/components/shop/Link';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useShop } from './ShopProvider';
import { AISLES, naira, minPrice, aisleLabel, waLink, isCombo, whereWeDeliver } from '@/lib/shop-client';
import { IBag, IChevron, IClose, IMenu, ISearch, IUser, IWhatsApp } from './Icons';

export const initials = (name: string | null | undefined, email = '') => { const p = (name || '').trim().split(/\s+/).filter(Boolean); return (p.length ? (p[0][0] + (p[1]?.[0] || '')) : email[0] || '?').toUpperCase(); };
const MEGA = [...AISLES.map(a => ({ id: a.id, label: a.label, lower: a.lower })), { id: 'deals', label: 'Deals', lower: 'deals' }];

export default function Header() {
  const { data, count, setCartOpen, user } = useShop();
  const [menu, setMenu] = useState(false);
  const [sub, setSub] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const m = window.matchMedia('(max-width: 640px)'); const f = () => setNarrow(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  const box = useRef<HTMLDivElement>(null);
  // on the results page, keep the words in the search box
  useEffect(() => { if (location.pathname === '/search') setQ(new URLSearchParams(location.search).get('q') || ''); }, []);
  const biz = data.business;

  const items = (id: string) => (id === 'deals'
    ? data.products.filter(p => p.sizes.some(s => s.sale && s.price && s.sale < s.price))
    : data.products.filter(p => p.cat === id)).slice(0, 7);
  const sugg = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!t) return [];
    return data.products.filter(p => p.name.toLowerCase().includes(t) || (p.items || []).join(' ').toLowerCase().includes(t)).slice(0, 6);
  }, [q, data.products]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setFocus(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menu]);

  const go = (href: string) => { setMenu(false); setSub(null); setFocus(false); window.location.assign(href); };
  const submit = (e?: React.FormEvent) => { e?.preventDefault(); const t = q.trim(); if (t) { go('/search?q=' + encodeURIComponent(t)); } };

  return (
    <>
      <a href="#main" className="ub" style={{ position: 'absolute', left: -9999 }}>Skip to content</a>
      <div style={{ background: '#D49B41', color: '#0B3A23', textAlign: 'center', fontSize: 13, fontWeight: 600, padding: '9px 16px' }}>
        Delivery in {whereWeDeliver(data.zones)} · Pay online, securely · <Link href="/help" style={{ color: 'inherit', textUnderlineOffset: 3 }}>How Tiada works</Link>
      </div>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderBottom: '1px solid #ECE8DF' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '12px clamp(16px, 3vw, 28px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 12px' }}>
          <button type="button" className="ub icn mob-only" aria-label="Open menu" onClick={() => setMenu(true)} style={{ width: 44, height: 44, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', color: '#0B3A23' }}><IMenu size={24} /></button>
          <Link href="/" aria-label="Tiada Marketplace home" style={{ display: 'block' }}><img className="logo-img" src="/logo-sm.png" alt="Tiada Marketplace" style={{ height: 62, width: 'auto', display: 'block' }} /></Link>

          <div ref={box} className="hsearch-wrap" style={{ position: 'relative', flex: '1 1 auto', maxWidth: 560, margin: '0 28px 0 36px', minWidth: 0 }}>
            <form role="search" onSubmit={submit} className="hsearch" style={{ height: 48, padding: '0 6px 0 16px', borderRadius: 4, border: '1.5px solid #CFC8B9', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="search" value={q} onChange={e => { setQ(e.target.value); setFocus(true); }} onFocus={() => setFocus(true)} onKeyDown={e => { if (e.key === 'Escape') { setFocus(false); (e.target as HTMLInputElement).blur(); } }}
                aria-label="Search products" placeholder={narrow ? 'Search' : 'Search Milo, oats, Student combo…'} style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontSize: 14, color: '#1F2A23' }} />
              <button type="submit" className="ub hs-btn" aria-label="Search" style={{ width: 44, height: 38, borderRadius: 3, background: '#0B3A23', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><ISearch size={18} color="#FFFFFF" stroke={2} /></button>
            </form>
            {focus && q.trim() && (
              <div className="drop-in" role="listbox" style={{ ...(narrow ? { position: 'fixed', left: 12, right: 12, top: (box.current?.getBoundingClientRect().bottom ?? 110) + 8, maxHeight: '70vh', overflowY: 'auto' } : { position: 'absolute', left: 0, right: 0, top: 54 }), background: '#FFFFFF', borderRadius: 6, border: '1px solid #ECE8DF', boxShadow: '0 20px 50px rgba(17,32,23,.16)', padding: 6, zIndex: 50 }}>
                {sugg.map(p => (
                  <button key={p.id} type="button" role="option" aria-selected="false" className="ub drop-row" onClick={() => go('/p/' + p.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 4 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 4, overflow: 'hidden', background: '#F8F6F1', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.img ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="serif" style={{ color: '#8A5F1C' }}>{p.name[0]}</span>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span><span style={{ fontSize: 12, color: '#66736B' }}>{aisleLabel(p.cat)}</span></span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', flex: 'none' }}>{isCombo(p) ? '' : 'From '}{naira(minPrice(p))}</span>
                  </button>
                ))}
                {!sugg.length && <p style={{ margin: 0, padding: '14px 10px', fontSize: 13.5, color: '#66736B' }}>Nothing matches “{q.trim()}”. Try “rice” or “combo”.</p>}
                <button type="button" className="ub drop-row" onClick={() => submit()} style={{ width: '100%', padding: '10px', borderTop: '1px solid #F0ECE3', fontSize: 13.5, fontWeight: 600, color: '#0B3A23' }}>See all results for “{q.trim()}” →</button>
              </div>
            )}
          </div>

          <a href={waLink(biz.whatsapp)} target="_blank" rel="noopener" className="help-chip desk-only" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#1F2A23', marginRight: 8, flex: 'none' }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#F1F5F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B3A23' }}><IWhatsApp size={19} /></span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}><span style={{ fontSize: 11.5, color: '#66736B' }}>Order or ask on WhatsApp</span><span style={{ fontSize: 14, fontWeight: 600 }}>{biz.phone}</span></span>
          </a>
          <nav aria-label="Shortcuts" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
            {user ? (
              <Link href="/account" className="ub icn" aria-label={`Your account, ${user.name || user.email}`} style={{ height: 44, padding: '0 8px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 8, color: '#0B3A23', textDecoration: 'none' }}>
                <IUser size={23} /><span className="desk-only" style={{ fontSize: 13.5, fontWeight: 500, color: '#1F2A23', whiteSpace: 'nowrap' }}>{user.name ? user.name.split(' ')[0] : 'Account'}</span>
              </Link>
            ) : <Link href="/account" className="ub icn" aria-label="Sign in or create an account" style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B3A23' }}><IUser size={23} /></Link>}
            <button type="button" className="ub icn" aria-label={`Cart, ${count} items`} onClick={() => setCartOpen(true)} style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B3A23' }}>
              <IBag size={23} />
              {count > 0 && <span key={count} className="pop" style={{ position: 'absolute', top: 3, right: 1, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: '#0B3A23', color: '#FFFFFF', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>}
            </button>
          </nav>
        </div>
        <nav aria-label="Aisles" className="desk-only" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px, 3vw, 28px) 12px' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
            {MEGA.map(m => (
              <li key={m.id} className="mega-item">
                <Link href={'/aisle/' + m.id} className="ub tile" aria-haspopup="true" style={{ width: '100%', height: 44, padding: '0 12px 0 14px', background: '#0B3A23', color: '#FFFFFF', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 2 }}>
                  <span>{m.label}</span><span className="chev" style={{ display: 'flex' }}><IChevron size={14} color="#F6E9CF" stroke={2} /></span>
                </Link>
                <div className="mega-drop" role="menu">
                  {items(m.id).map(p => <Link key={p.id} href={'/p/' + p.id} role="menuitem" className="ub drop-row" style={{ display: 'block', width: '100%', padding: '10px 18px', fontSize: 14, color: '#1F2A23' }}>{p.name}</Link>)}
                  <div style={{ height: 1, background: '#ECE8DF', margin: '6px 18px' }} />
                  <Link href={'/aisle/' + m.id} role="menuitem" className="ub drop-row" style={{ display: 'block', width: '100%', padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#0B3A23' }}>Shop all {m.lower} →</Link>
                </div>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {menu && (
        <div role="dialog" aria-modal="true" aria-label="Menu" style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
          <div onClick={() => setMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(17,32,23,0.45)', animation: 'fadeIn .2s ease' }} />
          <div className="thin" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 'min(360px, 88vw)', background: '#FFFFFF', overflowY: 'auto', animation: 'slideL .3s cubic-bezier(.2,.8,.2,1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px 10px 20px', borderBottom: '1px solid #ECE8DF' }}>
              <img src="/logo-sm.png" alt="Tiada Marketplace" style={{ height: 46 }} />
              <button type="button" className="ub icn" aria-label="Close menu" onClick={() => setMenu(false)} style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IClose /></button>
            </div>
            {!sub ? (
              <div className="fade" style={{ padding: '8px 0' }}>
                {MEGA.map(m => (
                  <button key={m.id} type="button" className="ub drop-row" onClick={() => setSub(m.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', fontSize: 15.5, fontWeight: 500 }}>
                    <span>{m.label}</span><IChevron dir="right" size={16} color="#66736B" />
                  </button>
                ))}
                <div style={{ height: 1, background: '#ECE8DF', margin: '8px 20px' }} />
                {[['/account', user ? `My account · ${user.name?.split(' ')[0] || 'signed in'}` : 'Sign in or create an account'], ['/track', 'Track an order'], ['/help', 'Help and delivery days']].map(([h, l]) => (
                  <button key={h} type="button" className="ub drop-row" onClick={() => go(h)} style={{ width: '100%', padding: '13px 20px', fontSize: 14.5 }}>{l}</button>
                ))}
                <a href={waLink(biz.whatsapp)} target="_blank" rel="noopener" style={{ margin: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 6, background: '#F1F5F1', textDecoration: 'none', color: '#0B3A23', fontWeight: 600, fontSize: 14 }}><IWhatsApp size={18} /> WhatsApp {biz.phone}</a>
              </div>
            ) : (
              <div className="fade" style={{ padding: '8px 0' }}>
                <button type="button" className="ub" onClick={() => setSub(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', fontSize: 13.5, fontWeight: 600, color: '#66736B' }}><IChevron dir="left" size={16} /> All aisles</button>
                <p style={{ margin: '4px 20px 10px', fontSize: 20, fontWeight: 500 }}>{MEGA.find(m => m.id === sub)?.label}</p>
                {items(sub).map(p => <button key={p.id} type="button" className="ub drop-row" onClick={() => go('/p/' + p.id)} style={{ width: '100%', padding: '12px 20px', fontSize: 14.5 }}>{p.name}</button>)}
                <button type="button" className="ub drop-row" onClick={() => go('/aisle/' + sub)} style={{ width: '100%', padding: '14px 20px', fontSize: 14.5, fontWeight: 600, color: '#0B3A23' }}>Shop all {MEGA.find(m => m.id === sub)?.lower} →</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
