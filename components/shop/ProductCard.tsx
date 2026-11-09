'use client';
import Link from '@/components/shop/Link';

import { useShop } from './ShopProvider';
import { naira, minPrice, maxOff, isSoldOut, lowLeft, sellable, isCombo, lineKey } from '@/lib/shop-client';
import type { PubProduct } from '@/lib/storefront';

export function ProductImage({ p, size = 22 }: { p: PubProduct; size?: number }) {
  return p.img
    ? <img src={p.img} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    : <span className="serif" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center', fontSize: size, color: '#0B3A23' }}>{p.name}</span>;
}

export function cardMeta(p: PubProduct) {
  if (isCombo(p)) return `${(p.items || []).length} items · swap any`;
  const labs = sellable(p).map(s => s.label);
  return labs.length > 1 ? `${labs.length} sizes · ${labs[0]} to ${labs[labs.length - 1]}` : labs[0] ? `${labs[0]} pack` : '';
}

export default function ProductCard({ p, list }: { p: PubProduct; list?: boolean }) {
  const { setChoose, add, cart, setQty } = useShop();
  const combo = isCombo(p);
  const sold = isSoldOut(p);
  const off = maxOff(p);
  const low = sold ? null : lowLeft(p);
  const many = sellable(p).length > 1;
  const pkg = combo ? sellable(p)[0] : null;
  const key = pkg ? lineKey(p.id, pkg.label) : '';
  const qty = pkg ? cart.find(l => l.key === key)?.qty || 0 : 0;
  const href = '/p/' + p.id;
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); fn(); };

  const action = (
    <div style={{ marginTop: list ? 0 : 'auto', paddingTop: list ? 0 : 4, width: list ? 200 : undefined }}>
      {sold ? <span style={{ width: '100%', height: 44, borderRadius: 4, background: '#EDEBE5', color: '#66736B', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sold out</span>
        : combo && qty > 0 ? (
          <div className="pop" onClick={e => e.stopPropagation()} style={{ height: 44, borderRadius: 4, border: '1px solid #0B3A23', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" className="ub icn" aria-label={`One less ${p.name}`} onClick={stop(() => setQty(key, qty - 1))} style={{ width: 44, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, color: '#0B3A23' }}>−</button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{qty} in cart</span>
            <button type="button" className="ub icn" aria-label={`One more ${p.name}`} onClick={stop(() => setQty(key, qty + 1))} style={{ width: 44, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, color: '#0B3A23' }}>+</button>
          </div>
        ) : (
          <button type="button" className="ub btn-solid press" onClick={stop(() => (combo && pkg ? add(p.id, pkg.label, 1) : many ? setChoose(p.id) : add(p.id, sellable(p)[0]?.label, 1)))}
            style={{ width: '100%', height: 44, borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {combo || !many ? 'Add to cart' : 'Choose size'}
          </button>
        )}
    </div>
  );

  const badges = (
    <span style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, pointerEvents: 'none' }}>
      {off > 0 && <span style={{ background: '#D49B41', color: '#0B3A23', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 3 }}>Up to {off}% off</span>}
      {p.status === 'fast' && <span style={{ background: '#0B3A23', color: '#F6E9CF', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 3 }}>Fast selling</span>}
    </span>
  );
  const price = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 8px' }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: off > 0 ? '#9A4E12' : '#0B3A23' }}>{many ? 'From ' : ''}{naira(minPrice(p))}</span>
      {p.rating && <span style={{ fontSize: 12, color: '#66736B' }}>★ {p.rating.avg} ({p.rating.n})</span>}
    </div>
  );

  if (list) return (
    <li className="pcard" onClick={() => window.location.assign(href)} style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px 22px', padding: '18px 0', borderBottom: '1px solid #ECE8DF' }}>
      <div className="pimg" style={{ position: 'relative', width: 120, aspectRatio: '1 / 1', borderRadius: 5, overflow: 'hidden', background: '#F8F6F1', flex: 'none' }}><ProductImage p={p} size={15} />{sold && <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.72)' }} />}</div>
      <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link href={href} className="pname" onClick={e => e.stopPropagation()} style={{ fontSize: 15.5, fontWeight: 500, color: '#1F2A23', textDecoration: 'none' }}>{p.name}</Link>
        <span style={{ fontSize: 12.5, color: '#66736B' }}>{cardMeta(p)}</span>
        {price}
        {low != null && <span style={{ fontSize: 12, fontWeight: 600, color: '#B8402B' }}>Only {low} left</span>}
      </div>
      {action}
    </li>
  );

  return (
    <article className="pcard tcard" onClick={() => window.location.assign(href)} style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0, cursor: 'pointer', background: '#FFFFFF', border: '1px solid #ECE8E0', borderRadius: 8, padding: '10px 10px 12px' }}>
      <div className="pimg" style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 5, overflow: 'hidden', background: '#F8F6F1' }}>
        <ProductImage p={p} />
        {badges}
        {sold && <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><span style={{ background: '#1F2A23', color: '#FFFFFF', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', padding: '7px 14px' }}>SOLD OUT</span></span>}
      </div>
      <Link href={href} className="pname" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'flex-start', fontSize: 14, fontWeight: 500, lineHeight: 1.42, color: '#1F2A23', minHeight: 40, textDecoration: 'none' }}>{p.name}</Link>
      <span style={{ fontSize: 12.5, color: '#66736B', marginTop: -4 }}>{cardMeta(p)}</span>
      {price}
      {low != null && <span style={{ fontSize: 12, fontWeight: 600, color: '#B8402B' }}>Only {low} left</span>}
      {action}
    </article>
  );
}
