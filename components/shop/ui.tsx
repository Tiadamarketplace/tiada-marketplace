'use client';
import Link from '@/components/shop/Link';
import { useShop } from './ShopProvider';
import { ProductImage } from './ProductCard';

/** Small shared pieces used across the shop pages. */
export const field: React.CSSProperties = { height: 50, padding: '0 14px', borderRadius: 4, border: '1px solid #DCD6CA', fontSize: 15, background: '#FFFFFF', color: '#1F2A23', width: '100%', minWidth: 0 };
export const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 };
export const btnSolid: React.CSSProperties = { height: 52, padding: '0 28px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 };
export const btnOut: React.CSSProperties = { height: 50, padding: '0 24px', borderRadius: 4, border: '1.5px solid #0B3A23', color: '#0B3A23', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' };
export const H1 = ({ children }: { children: React.ReactNode }) => <h1 style={{ margin: 0, fontWeight: 500, fontSize: 'clamp(30px, 4vw, 42px)', letterSpacing: '-0.015em' }}>{children}</h1>;
export const Page = ({ children, w = 1100 }: { children: React.ReactNode; w?: number }) => <div className="fade" style={{ maxWidth: w, margin: '0 auto', padding: '40px clamp(16px, 3vw, 28px) 0' }}>{children}</div>;

export function Thumb({ pid, size, qty }: { pid: string; size: number; qty?: number }) {
  const { byId } = useShop(); const p = byId[pid];
  return (
    <span style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: 6, overflow: 'hidden', background: '#F7F4EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p && <ProductImage p={p} size={12} />}</span>
      {qty != null && <span style={{ position: 'absolute', top: -7, right: -7, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999, background: '#1F2A23', color: '#FFFFFF', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qty}</span>}
    </span>
  );
}

export function EmptyCart() {
  return (
    <div style={{ textAlign: 'center', padding: '72px 0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Your cart is empty</p>
      <p style={{ margin: 0, fontSize: 14, color: '#66736B' }}>Cereals by weight, combos and pantry staples are waiting.</p>
      <Link href="/aisle/all" className="ub btn-solid press" style={btnSolid}>Start shopping</Link>
    </div>
  );
}
