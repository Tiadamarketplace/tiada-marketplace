'use client';
import { Spin } from './ui';
import Link from '@/components/shop/Link';
import { useState } from 'react';
import { useShop } from './ShopProvider';
import { AISLES, api } from '@/lib/shop-client';
import { INote } from './Icons';

const H = ({ children }: { children: React.ReactNode }) => <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D49B41' }}>{children}</span>;
const L = ({ href, children }: { href: string; children: React.ReactNode }) => <Link href={href} className="quiet" style={{ color: 'rgba(236,241,237,0.86)', textDecoration: 'none' }}>{children}</Link>;

export default function Footer() {
  const { data, notify } = useShop();
  const b = data.business;
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return notify('warn', 'Check your email address.', 'It looks incomplete.');
    setBusy(true);
    try { await api('/api/subscribe', { json: { email: email.trim(), source: 'footer' } }); setJoined(true); }
    catch (err) { notify('err', 'We couldn’t add you just now.', (err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <footer style={{ marginTop: 96, background: '#0B3A23', color: 'rgba(236,241,237,0.86)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '64px clamp(16px, 3vw, 28px) 36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <span style={{ background: '#FBF9F4', borderRadius: 6, padding: '8px 14px' }}><img src="/logo-sm.png" alt="Tiada Marketplace" style={{ height: 58, width: 'auto', display: 'block' }} /></span>
          <p className="serif" style={{ margin: '6px 0 0', fontSize: 22, color: '#F6E9CF' }}>{b.tagline}</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>TIADA Marketplace is your trusted plug for quality foodstuff, cereals, groceries, and everyday kitchen essentials, making shopping easier, affordable, and stress-free.</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(236,241,237,0.7)' }}>{b.address}</p>
          {b.tiktok && (
            <a href={`https://www.tiktok.com/@${b.tiktok.replace(/^@/, '')}`} target="_blank" rel="noopener" aria-label={`Follow Tiada on TikTok, @${b.tiktok.replace(/^@/, '')}`} title="TikTok" style={{ marginTop: 6, width: 46, height: 46, borderRadius: '50%', background: '#D49B41', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(0,0,0,0.28)' }}>
              <INote size={22} color="#0B3A23" stroke={2.6} />
            </a>
          )}
        </div>
        <nav aria-label="Shop" style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
          <H>Shop</H>
          {AISLES.map(a => <L key={a.id} href={'/aisle/' + a.id}>{a.label}</L>)}
          <L href="/aisle/deals">Deals</L>
        </nav>
        <nav aria-label="Help" style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
          <H>Help</H>
          <L href="/help">How Tiada works</L>
          <L href="/track">Track my order</L>
          <L href="/help#delivery">Delivery and fees</L>
          <L href="/help#contact">Contact us</L>
          <L href="/account">My account</L>
        </nav>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <H>Newsletter</H>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>New stock and combo deals, now and then.</p>
          {!joined ? (
            <form onSubmit={join} style={{ display: 'flex', height: 48, borderBottom: '1px solid rgba(236,241,237,0.5)' }}>
              <label htmlFor="nl" style={{ position: 'absolute', left: -9999 }}>Email</label>
              <input id="nl" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: '#FFFFFF', fontSize: 14, outline: 'none' }} />
              <button type="submit" disabled={busy} className="ub" aria-label="Subscribe" style={{ width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F6E9CF', opacity: busy ? 0.5 : 1 }}>{busy ? <Spin size={16} /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}</button>
            </form>
          ) : <p className="pop" role="status" style={{ margin: 0, fontSize: 14, color: '#F6E9CF' }}>You’re on the list. Thank you.</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {['Paystack', 'Bank transfer', 'USSD', 'Visa · Mastercard · Verve'].map(t => <span key={t} style={{ padding: '5px 9px', border: '1px solid rgba(236,241,237,0.3)', borderRadius: 3, fontSize: 11.5 }}>{t}</span>)}
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(236,241,237,0.14)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '18px clamp(16px, 3vw, 28px)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 20px', fontSize: 12.5, color: 'rgba(236,241,237,0.7)' }}>
          <span>© {new Date().getFullYear()} {b.name}</span>
          <span style={{ display: 'flex', gap: 18 }}><Link href="/privacy" className="quiet" style={{ color: 'rgba(236,241,237,0.7)', textDecoration: 'none' }}>Privacy</Link><Link href="/terms" className="quiet" style={{ color: 'rgba(236,241,237,0.7)', textDecoration: 'none' }}>Terms</Link></span>
        </div>
      </div>
    </footer>
  );
}
