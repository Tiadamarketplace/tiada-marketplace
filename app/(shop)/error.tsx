'use client';
import { useEffect } from 'react';
export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="fade" style={{ maxWidth: 560, margin: '0 auto', padding: '80px clamp(16px, 3vw, 28px) 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: 30 }}>Something went wrong on our side</h1>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#4D5A52' }}>It’s not you. Your cart is saved. Try again, and if it keeps happening, message us on WhatsApp on 0807 511 0000.</p>
      <button type="button" className="ub btn-solid press" onClick={reset} style={{ height: 50, padding: '0 26px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontWeight: 600 }}>Try again</button>
    </div>
  );
}
