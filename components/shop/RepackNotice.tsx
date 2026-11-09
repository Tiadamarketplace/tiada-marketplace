'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const KEY = 'tiada_repack_ok_v1';

/** Shown on a customer's first visit: Tiada repacks from bulk, so items arrive in Tiada bags, not the brand's own box. */
export default function RepackNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = false; try { seen = !!localStorage.getItem(KEY); } catch { /* private mode: show it */ }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  const accept = () => { try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* */ } setOpen(false); };
  if (!open) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="rp-h" aria-describedby="rp-b" style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(17,32,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn .25s ease' }}>
      <div className="pop rp-card" style={{ width: 'min(760px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: '#FFFFFF', borderRadius: 6, display: 'flex', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>
        <div className="rp-pic" style={{ position: 'relative', flex: '0 0 300px', background: '#F7F4EC' }}>
          <img src="/img/repack.jpg" alt="Oats repacked into a clear Tiada Marketplace bag with the Tiada label" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{ position: 'absolute', left: 14, bottom: 14, padding: '6px 10px', background: 'rgba(255,255,255,0.94)', fontSize: 11.5, fontWeight: 600, color: '#1F2A23' }}>How your order arrives</span>
        </div>
        <div style={{ flex: 1, padding: 'clamp(24px, 4vw, 36px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A5F1C' }}>Before you shop</span>
          <h2 id="rp-h" style={{ margin: 0, fontWeight: 500, fontSize: 'clamp(24px, 3vw, 30px)', lineHeight: 1.2, letterSpacing: '-0.01em', color: '#1F2A23' }}>We repack, so you can buy just what you need.</h2>
          <div id="rp-b" style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 15, lineHeight: 1.7, color: '#4D5A52' }}>
            <p style={{ margin: 0 }}>Tiada buys cereals, milk and foodstuffs in their large original cartons and bags from trusted distributors. At our hub we measure them into smaller, sealed, food-grade bags, so you can buy 250g, 500g, 1kg or a paint instead of a whole carton, and pay less for it.</p>
            <p style={{ margin: 0 }}>So most items reach you in a <strong style={{ color: '#1F2A23', fontWeight: 600 }}>clear Tiada bag with our label</strong>, not in the brand’s own box or tin. The brand pictures on this site show you what’s inside. It is the same product, just repacked by us. Anything sold sealed in its original pack says so in its size, like “400g tin”.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px', marginTop: 6 }}>
            <button type="button" autoFocus className="ub btn-solid press" onClick={accept} style={{ height: 50, padding: '0 26px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center' }}>I understand, start shopping</button>
            <Link href="/help" onClick={accept} style={{ fontSize: 14, color: '#1F2A23', textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: '#B9B3A5' }}>How Tiada works</Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
