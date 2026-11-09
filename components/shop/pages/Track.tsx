'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useShop } from '../ShopProvider';
import OrderSteps from '../OrderSteps';
import { api, naira, waLink } from '@/lib/shop-client';
import { H1, btnSolid, field, labelStyle } from '../ui';

type T = { id: string; status: string; total: number; area_label: string | null; speed_label: string | null; created_at: string; items: { name: string; size: string; qty: number }[]; rider: { partner?: string; tracking?: string; driver?: string; phone?: string } | null; issue: { reason?: string; note?: string; eta?: string } | null };
const WORD: Record<string, string> = { new: 'Being packed', packed: 'Packed and ready', route: 'On the way', done: 'Delivered', issue: 'Delayed', refunded: 'Refunded', cancelled: 'Cancelled' };
const small: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#66736B' };
const link: React.CSSProperties = { color: '#1F2A23', textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: '#B9B3A5' };

/** Track an order without signing in: order code + last 4 digits of the phone used at checkout. */
export default function Track({ initial }: { initial: string }) {
  const { data, user } = useShop();
  const [code, setCode] = useState(initial);
  const [last4, setLast4] = useState('');
  const [o, setO] = useState<T | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr('');
    let c = code.trim().toUpperCase().replace(/\s/g, ''); if (/^\d+$/.test(c)) c = 'TD-' + c;
    if (!/^TD-\d{5,9}$/.test(c)) return setErr('Enter the order code from your email. It looks like TD-48213.');
    if (!/^\d{4}$/.test(last4)) return setErr('Enter the last 4 digits of the phone number you used at checkout.');
    setBusy(true);
    try { const r = await api<{ order: T }>('/api/track', { json: { code: c, last4 } }); setO(r.order); }
    catch (e) { setErr((e as Error).message); setO(null); } finally { setBusy(false); }
  };
  const zone = o ? data.zones.find(z => (z.state || z.label.split(',')[0]) === o.area_label) : null;
  const next = o && ({
    new: `We’re packing it now. It goes out ${zone?.state ? 'by courier' : `on ${zone?.day || 'your area’s delivery day'}`}.`,
    packed: `Packed and sealed. It leaves our hub ${zone?.state ? 'with the courier' : `on ${zone?.day || 'your area’s delivery day'}`}.`,
    route: o.rider?.driver ? `${o.rider.driver} has it and will call when close.` : o.rider?.tracking ? `With ${o.rider.partner}. Tracking number ${o.rider.tracking}.` : 'It has left our hub.',
    done: 'Delivered. Something wrong? Message us within 24 hours with a photo.',
  } as Record<string, string>)[o.status];

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto', padding: '48px clamp(16px, 3vw, 28px) 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40 }}>
        <div style={{ flex: '1 1 380px', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={small}>No account needed</span>
          <H1>Track an order</H1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#4D5A52' }}>Enter the order code from your confirmation email and the last 4 digits of the phone number you used at checkout.</p>
          <form onSubmit={e => { e.preventDefault(); go(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={labelStyle}>Order code<input value={code} onChange={e => { setCode(e.target.value); setErr(''); }} placeholder="TD-48213" autoCapitalize="characters" autoFocus={!initial} style={{ ...field, textTransform: 'uppercase', letterSpacing: '0.05em' }} /></label>
            <label style={labelStyle}>Last 4 digits of your phone<input value={last4} onChange={e => { setLast4(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr(''); }} inputMode="numeric" placeholder="4567" autoFocus={!!initial} style={{ ...field, letterSpacing: '0.2em' }} /></label>
            {err && <p role="alert" className="shake" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522', lineHeight: 1.5 }}>{err}</p>}
            <button type="submit" disabled={busy} className="ub btn-solid press" style={{ ...btnSolid, opacity: busy ? 0.7 : 1 }}>{busy ? 'Looking it up…' : 'Track order'}</button>
          </form>
        </div>
        <aside className="hide-xs" style={{ flex: '1 1 280px', maxWidth: 360, borderLeft: '1px solid #ECE8DF', paddingLeft: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, fontSize: 14.5, lineHeight: 1.7, color: '#4D5A52' }}>
          <div><div style={{ ...small, color: '#1F2A23', marginBottom: 6 }}>Can’t find your code?</div>Search your email for “Tiada”. The code is at the top of your order confirmation. Still stuck? <a href={waLink(data.business.whatsapp, 'Hi Tiada, I can’t find my order code.')} target="_blank" rel="noopener" style={link}>Message us on WhatsApp</a> with your name.</div>
          <div><div style={{ ...small, color: '#1F2A23', marginBottom: 6 }}>{user ? 'Signed in' : 'Have an account?'}</div>{user ? <>All your orders are in <Link href="/account#orders" style={link}>My account</Link>.</> : <><Link href="/account?next=/account" style={link}>Sign in</Link> to see every order you’ve placed, without codes.</>}</div>
        </aside>
      </div>

      {o && (
        <section className="fade" aria-label={`Order ${o.id}`} style={{ marginTop: 48, paddingTop: 28, borderTop: '1px solid #1F2A23', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 820 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 18px' }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 500 }}>{o.id}</h2>
            <span style={{ fontSize: 15, color: o.status === 'issue' ? '#9E3522' : '#0B3A23', fontWeight: 600 }}>{WORD[o.status] || o.status}</span>
            <span style={{ marginLeft: 'auto', fontSize: 13.5, color: '#66736B' }}>Placed {new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <OrderSteps status={o.status} />
          {o.status === 'issue' && o.issue ? <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#7A2A1B' }}>{o.issue.reason}. {o.issue.note}{o.issue.eta ? ` New delivery date: ${o.issue.eta}.` : ''}</p> : next && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#4D5A52' }}>{next}{o.status === 'route' && o.rider?.phone ? <> Rider’s number: <a href={'tel:' + o.rider.phone} style={link}>{o.rider.phone}</a>.</> : null}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, fontSize: 14.5, lineHeight: 1.7 }}>
            <div><div style={small}>Items</div><div style={{ marginTop: 6 }}>{o.items.map((it, i) => <div key={i}>{it.qty} × {it.name}{it.size !== 'Package' ? `, ${it.size}` : ''}</div>)}</div></div>
            <div><div style={small}>Delivery</div><div style={{ marginTop: 6 }}>{o.area_label}<br />{o.speed_label}</div></div>
            <div><div style={small}>Paid</div><div style={{ marginTop: 6 }}>{naira(o.total)}</div></div>
          </div>
          <p style={{ margin: 0, fontSize: 14 }}><a href={waLink(data.business.whatsapp, `Hi Tiada, about my order ${o.id}.`)} target="_blank" rel="noopener" style={link}>Question about this order? Message us</a></p>
        </section>
      )}
    </div>
  );
}
