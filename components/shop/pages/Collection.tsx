'use client';
import Link from '@/components/shop/Link';
import { useEffect, useMemo, useState } from 'react';
import { useShop } from '../ShopProvider';
import ProductCard from '../ProductCard';
import { AISLE_COPY } from '@/lib/aisles';
import { minPrice, maxOff, isSoldOut } from '@/lib/shop-client';
import type { PubProduct } from '@/lib/storefront';
import { IClose, IFilter } from '../Icons';

const PER = 20;
const PRICES: [string, string, (n: number) => boolean][] = [
  ['lo', 'Under ₦5,000', n => n < 5000], ['mid', '₦5,000 – ₦15,000', n => n >= 5000 && n <= 15000], ['hi', 'Over ₦15,000', n => n > 15000],
];
const inAisle = (p: PubProduct, a: string) => a === 'all' ? true : a === 'deals' ? maxOff(p) > 0 : p.cat === a;
const SIDE_AISLES = ['all', 'cereal', 'milk', 'grain', 'food', 'ccombo', 'fcombo', 'deals'];
const H3 = ({ id, children }: { id: string; children: React.ReactNode }) => <h3 id={id} style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4E5A53' }}>{children}</h3>;

export default function Collection({ aisle, q = '' }: { aisle: string; q?: string }) {
  const { data, setChatOpen } = useShop();
  const [a, setA] = useState(aisle);
  const [prices, setPrices] = useState<string[]>([]);
  const [stock, setStock] = useState(false);
  const [sale, setSale] = useState(false);
  const [sort, setSort] = useState('featured');
  const [list, setList] = useState(false);
  const [pg, setPg] = useState(1);
  const [open, setOpen] = useState(false);
  useEffect(() => { setA(aisle); setPg(1); }, [aisle, q]);
  useEffect(() => { try { setList(localStorage.getItem('tiada_view') === 'list'); } catch { /* */ } }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
  const view = (l: boolean) => { setList(l); try { localStorage.setItem('tiada_view', l ? 'list' : 'grid'); } catch { /* */ } };

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const base = useMemo(() => data.products.filter(p => {
    if (!words.length) return true;
    const hay = (p.name + ' ' + (p.items || []).join(' ') + ' ' + (AISLE_COPY[p.cat]?.[0] || '')).toLowerCase();
    return words.every(w => hay.includes(w));
  }), [data.products, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = base.filter(p => inAisle(p, a)
    && (!prices.length || PRICES.some(([k, , f]) => prices.includes(k) && f(minPrice(p))))
    && (!stock || !isSoldOut(p)) && (!sale || maxOff(p) > 0));
  const sorted = [...filtered].sort((x, y) => {
    if (sort === 'price-asc') return minPrice(x) - minPrice(y);
    if (sort === 'price-desc') return minPrice(y) - minPrice(x);
    if (sort === 'az') return x.name.localeCompare(y.name);
    return Number(isSoldOut(x)) - Number(isSoldOut(y));
  });
  const total = sorted.length, pages = Math.max(1, Math.ceil(total / PER)), page = Math.min(pg, pages);
  const shown = sorted.slice((page - 1) * PER, page * PER);
  const nFilters = prices.length + Number(stock) + Number(sale) + Number(a !== aisle);
  const clear = () => { setPrices([]); setStock(false); setSale(false); setA(aisle); setPg(1); };
  const copy = AISLE_COPY[a] || AISLE_COPY.all;
  const title = q ? `Results for “${q}”` : AISLE_COPY[aisle][0];
  const go = (n: number) => { setPg(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '18px clamp(16px, 3vw, 28px) 0' }}>
      <nav aria-label="Breadcrumb"><ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12.5, color: '#4E5A53' }}><li><Link href="/" className="quiet" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link></li><li aria-hidden="true">›</li><li aria-current="page" style={{ color: '#1F2A23' }}>{q ? 'Search' : title}</li></ol></nav>
      <div className="fade" style={{ textAlign: 'center', padding: 'clamp(24px, 4vw, 44px) 0 8px' }}>
        <h1 style={{ margin: 0, fontWeight: 500, fontSize: 'clamp(30px, 4vw, 44px)', letterSpacing: '-0.015em' }}>{title}</h1>
        <p style={{ margin: '10px auto 0', maxWidth: 560, fontSize: 14.5, lineHeight: 1.65, color: '#4E5A53' }}>{q ? `${total} product${total === 1 ? '' : 's'} found` : AISLE_COPY[aisle][1]}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 40, marginTop: 28 }}>
        {open && <button type="button" className="ub" aria-label="Close filters" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 71, width: '100%', background: 'rgba(17,32,23,0.42)', animation: 'fadeIn .2s' }} />}
        <aside aria-label="Filters" className={'sidebar thin' + (open ? ' open' : '')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Filters</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {nFilters > 0 && <button type="button" className="ub lnk" onClick={clear} style={{ fontSize: 13, minHeight: 36, color: '#0B3A23' }}>Clear all</button>}
              <button type="button" className="ub icn mob-only" aria-label="Close filters" onClick={() => setOpen(false)} style={{ width: 40, height: 40, borderRadius: '50%', alignItems: 'center', justifyContent: 'center' }}><IClose size={18} /></button>
            </span>
          </div>
          <section aria-labelledby="sb-a" role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <H3 id="sb-a">Aisle</H3>
            {SIDE_AISLES.map(id => { const on = a === id; const n = base.filter(p => inAisle(p, id)).length; return (
              <button key={id} type="button" className="ub side" role="radio" aria-checked={on} onClick={() => { setA(id); setPg(1); }} style={{ minHeight: 40, padding: '0 10px', margin: '0 -10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: on ? 600 : 400, color: on ? '#0B3A23' : '#1F2A23' }}>
                <span style={{ width: 16, height: 16, flex: 'none', borderRadius: '50%', border: on ? '5px solid #0B3A23' : '1.5px solid #B9B3A5', background: '#FFFFFF' }} />
                <span style={{ flex: 1 }}>{AISLE_COPY[id][0]}</span><span style={{ fontSize: 12, color: '#66736B' }}>{n}</span>
              </button>); })}
          </section>
          <section aria-labelledby="sb-p" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <H3 id="sb-p">Price</H3>
            {PRICES.map(([k, l, f]) => { const on = prices.includes(k); return (
              <button key={k} type="button" className="ub side" role="checkbox" aria-checked={on} onClick={() => { setPrices(p => on ? p.filter(x => x !== k) : p.concat(k)); setPg(1); }} style={{ minHeight: 40, padding: '0 10px', margin: '0 -10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ width: 18, height: 18, flex: 'none', borderRadius: 4, border: `1.5px solid ${on ? '#0B3A23' : '#B9B3A5'}`, background: on ? '#0B3A23' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}</span>
                <span style={{ flex: 1 }}>{l}</span><span style={{ fontSize: 12, color: '#66736B' }}>{base.filter(p => inAisle(p, a) && f(minPrice(p))).length}</span>
              </button>); })}
          </section>
          <section aria-label="Show only" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <H3 id="sb-s">Show only</H3>
            {([['In stock only', stock, () => setStock(!stock)], ['On sale only', sale, () => setSale(!sale)]] as [string, boolean, () => void][]).map(([l, on, fn]) => (
              <button key={l} type="button" className="ub" role="switch" aria-checked={on} onClick={() => { fn(); setPg(1); }} style={{ minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                <span>{l}</span>
                <span style={{ width: 38, height: 22, borderRadius: 999, background: on ? '#0B3A23' : '#C9CFC9', position: 'relative', display: 'block', flex: 'none', transition: 'background .2s' }}><span style={{ position: 'absolute', top: 3, left: 3, width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF', transition: 'transform .2s', transform: `translateX(${on ? 16 : 0}px)` }} /></span>
              </button>
            ))}
          </section>
          <div style={{ padding: 16, borderRadius: 8, background: '#F6F1E7', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="serif" style={{ fontSize: 17, color: '#0B3A23' }}>Need it in bulk?</span>
            <span style={{ fontSize: 13, lineHeight: 1.55, color: '#3C4741' }}>Bags of rice, beans and garri for events or shops. Message us for a quote.</span>
            <button type="button" className="ub lnk" onClick={() => { setOpen(false); setChatOpen(true); }} style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, color: '#0B3A23', minHeight: 32 }}>Ask for a quote</button>
          </div>
          <button type="button" className="ub btn-solid mob-only" onClick={() => setOpen(false)} style={{ height: 50, borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontWeight: 600, alignItems: 'center', justifyContent: 'center' }}>Show {total} products</button>
        </aside>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px 20px', padding: '0 0 14px', borderBottom: '1px solid #ECE8DF' }}>
            <button type="button" className="ub chip mob-only" onClick={() => setOpen(true)} style={{ height: 40, padding: '0 16px', borderRadius: 999, border: '1px solid #DCD6CA', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}><IFilter size={16} /><span>Filter</span>{nFilters > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: '#0B3A23', color: '#FFFFFF', fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nFilters}</span>}</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600 }}>Sort by
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ height: 38, padding: '0 10px', border: 0, background: 'transparent', fontSize: 13.5, color: '#1F2A23', cursor: 'pointer' }}>
                <option value="featured">Featured</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option><option value="az">Alphabetically, A–Z</option>
              </select>
            </label>
            <span aria-live="polite" className="hide-xs" style={{ fontSize: 13, color: '#4E5A53' }}>{total ? `Showing ${(page - 1) * PER + 1}–${(page - 1) * PER + shown.length} of ${total}` : ''}</span>
            <div role="group" aria-label="View as" className="hide-xs" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 600 }}>View as
              <button type="button" className="ub icn" aria-label="List" aria-pressed={list} onClick={() => view(true)} style={{ width: 40, height: 40, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: list ? 1 : 0.45 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2A23" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg></button>
              <button type="button" className="ub icn" aria-label="Grid" aria-pressed={!list} onClick={() => view(false)} style={{ width: 40, height: 40, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: list ? 0.45 : 1 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2A23" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" /><rect x="13.5" y="4" width="6.5" height="6.5" /><rect x="4" y="13.5" width="6.5" height="6.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" /></svg></button>
            </div>
          </div>

          {!total ? (
            <div className="fade" style={{ margin: '40px auto 0', maxWidth: 520, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>{q ? `We don’t have “${q}” yet` : 'Nothing matches these filters'}</p>
              <p style={{ margin: 0, fontSize: 14, color: '#4E5A53' }}>{q ? 'Check the spelling, or ask us on chat. We may be able to get it for you.' : 'Try removing a filter.'}</p>
              {nFilters > 0 && <button type="button" className="ub btn-solid" onClick={clear} style={{ height: 44, padding: '0 22px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center' }}>Clear filters</button>}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                {['Milo', 'Cornflakes', 'Golden Morn', 'Rice', 'Combo'].map(t => <Link key={t} href={'/search?q=' + encodeURIComponent(t)} className="chip" style={{ height: 38, padding: '0 16px', borderRadius: 999, border: '1px solid #DCD6CA', fontSize: 13, display: 'flex', alignItems: 'center', color: '#1F2A23', textDecoration: 'none' }}>{t}</Link>)}
              </div>
            </div>
          ) : list ? (
            <ul key={a + page + sort} className="fade" style={{ listStyle: 'none', margin: '24px 0 0', padding: 0 }}>{shown.map(p => <ProductCard key={p.id} p={p} list />)}</ul>
          ) : (
            <div key={a + page + sort} className="grid grid4 fade" style={{ marginTop: 30 }}>{shown.map(p => <ProductCard key={p.id} p={p} />)}</div>
          )}

          {pages > 1 && (
            <nav aria-label="Pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 44 }}>
              <button type="button" className="ub quiet" disabled={page === 1} onClick={() => go(page - 1)} style={{ height: 44, padding: '0 14px', fontSize: 14, color: page === 1 ? '#B9BFBA' : '#1F2A23' }}>‹ Previous</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => n === page
                ? <span key={n} aria-current="page" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, borderBottom: '2px solid #0B3A23' }}>{n}</span>
                : <button key={n} type="button" className="ub quiet" onClick={() => go(n)} aria-label={`Page ${n}`} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#4E5A53' }}>{n}</button>)}
              <button type="button" className="ub quiet" disabled={page === pages} onClick={() => go(page + 1)} style={{ height: 44, padding: '0 14px', fontSize: 14, color: page === pages ? '#B9BFBA' : '#1F2A23' }}>Next ›</button>
            </nav>
          )}
        </div>
      </div>
      {!q && (
        <section style={{ maxWidth: 820, margin: '64px auto 0', paddingTop: 32, borderTop: '1px solid #ECE8DF' }}>
          <h2 style={{ margin: '0 0 12px', fontWeight: 500, fontSize: 22 }}>{copy[0]} at Tiada</h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.8, color: '#3C4741' }}>{copy[2]}</p>
        </section>
      )}
    </div>
  );
}
