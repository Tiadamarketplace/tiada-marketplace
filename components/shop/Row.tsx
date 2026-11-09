'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ProductCard from './ProductCard';
import type { PubProduct } from '@/lib/storefront';
import { IChevron } from './Icons';

export default function Row({ title, items, href, children }: { title: string; items: PubProduct[]; href?: string; children?: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ l: 0, w: 100 });
  const measure = () => {
    const t = track.current; if (!t) return;
    const w = t.scrollWidth > 0 ? Math.min(100, (t.clientWidth / t.scrollWidth) * 100) : 100;
    const max = t.scrollWidth - t.clientWidth;
    setBar({ w, l: max > 0 ? (t.scrollLeft / max) * (100 - w) : 0 });
  };
  useEffect(() => { measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }, [items.length]);
  const step = (d: number) => { const t = track.current; if (t) t.scrollBy({ left: d * t.clientWidth * 0.9, behavior: 'smooth' }); };
  if (!items.length) return null;
  const arrow = (d: number) => (
    <button type="button" className="ub arrow" aria-label={`Scroll ${title} ${d < 0 ? 'left' : 'right'}`} onClick={() => step(d)}
      style={{ position: 'absolute', [d < 0 ? 'left' : 'right']: -20, top: '28%', width: 44, height: 44, borderRadius: '50%', background: '#FFFFFF', color: '#0B3A23', boxShadow: '0 6px 18px rgba(17,32,23,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <IChevron dir={d < 0 ? 'left' : 'right'} size={18} stroke={2} />
    </button>
  );
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '56px clamp(16px, 3vw, 28px) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontWeight: 500, fontSize: 'clamp(22px, 2.4vw, 28px)', letterSpacing: '-0.01em', color: '#1F2A23' }}>{title}</h2>
        {href && <Link href={href} className="lnk" style={{ fontSize: 14, fontWeight: 500, color: '#0B3A23' }}>View all</Link>}
      </div>
      <div className="row-wrap" style={{ position: 'relative' }}>
        <div className="track" ref={track} onScroll={measure}>
          {items.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
        {bar.w < 100 && arrow(-1)}{bar.w < 100 && arrow(1)}
      </div>
      <div aria-hidden="true" style={{ opacity: bar.w < 100 ? 1 : 0, position: 'relative', width: 'min(320px, 60%)', height: 3, margin: '26px auto 0', borderRadius: 3, background: '#ECE8DF', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', top: 0, bottom: 0, left: bar.l + '%', width: bar.w + '%', borderRadius: 3, background: '#1F2A23', transition: 'left .15s linear' }} />
      </div>
      {children}
    </section>
  );
}
