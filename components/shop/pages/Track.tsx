'use client';
import { useState } from 'react';
import { useShop } from '../ShopProvider';
import OrderSteps, { StatusPill } from '../OrderSteps';
import { api, naira, waLink } from '@/lib/shop-client';
import { H1, btnSolid, field, labelStyle } from '../ui';

type T = { id: string; status: string; total: number; area_label: string | null; speed_label: string | null; created_at: string; items: { name: string; size: string; qty: number }[]; rider: { partner?: string; tracking?: string; driver?: string; phone?: string } | null; issue: { reason?: string; note?: string; eta?: string } | null };
export default function Track({ initial }: { initial: string }) {
  const { data } = useShop();
  const [code, setCode] = useState(initial);
  const [last4, setLast4] = useState('');
  const [o, setO] = useState<T | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(''); setBusy(true);
    let c = code.trim().toUpperCase().replace(/\s/g, ''); if (/^\d+$/.test(c)) c = 'TD-' + c;
    try { const r = await api<{ order: T }>('/api/track', { json: { code: c, last4: last4.trim() } }); setO(r.order); }
    catch (e) { setErr((e as Error).message); setO(null); } finally { setBusy(false); }
  };
  const zone = o ? data.zones.find(z => (z.state || z.label.split(',')[0]) === o.area_label) : null;
  return (
    <div className="fade" style={{ maxWidth: 640, margin: '0 auto', padding: '48px clamp(16px, 3vw, 28px) 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <H1>Track your order</H1>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#4D5A52' }}>Enter the code from your confirmation email (it starts with TD-) and the last 4 digits of the phone number you used at checkout.</p>
      <form onSubmit={e => { e.preventDefault(); go(); }} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
        <label style={labelStyle}>Order code<input value={code} onChange={e => setCode(e.target.value)} placeholder="TD-84920" autoCapitalize="characters" style={{ ...field, textTransform: 'uppercase', letterSpacing: '0.05em' }} /></label>
        <label style={labelStyle}>Last 4 digits of phone<input value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="1234" style={field} /></label>
        <button type="submit" disabled={busy} className="ub btn-solid press" style={{ ...btnSolid, gridColumn: '1 / -1', opacity: busy ? 0.7 : 1 }}>{busy ? 'Looking…' : 'Track order'}</button>
      </form>
      {err && <p role="alert" className="shake" style={{ margin: 0, padding: '12px 14px', borderRadius: 6, background: '#F8E6E1', color: '#7A2A1B', fontSize: 14 }}>{err}</p>}
      {o && (
        <section className="fade" aria-label={`Order ${o.id}`} style={{ border: '1px solid #ECE8DF', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><strong style={{ fontSize: 18, letterSpacing: '0.04em' }}>{o.id}</strong><StatusPill s={o.status} /></div>
          <OrderSteps status={o.status} />
          {o.status === 'issue' && o.issue && <p style={{ margin: 0, padding: '12px 14px', borderRadius: 6, background: '#FBEFEB', fontSize: 13.5, lineHeight: 1.6 }}><strong>{o.issue.reason}</strong> {o.issue.note}{o.issue.eta ? ` New date: ${o.issue.eta}.` : ''}</p>}
          {o.status === 'new' && <p style={{ margin: 0, fontSize: 14, color: '#4D5A52' }}>We’re packing it. It goes out {zone?.state ? 'by courier' : `on ${zone?.day || 'your area’s delivery day'}`}.</p>}
          {o.rider?.tracking && <p style={{ margin: 0, fontSize: 14 }}>Courier: <strong>{o.rider.partner}</strong> · tracking number <strong>{o.rider.tracking}</strong></p>}
          {o.rider?.driver && o.status === 'route' && <p style={{ margin: 0, fontSize: 14 }}>Your rider is <strong>{o.rider.driver}</strong>{o.rider.phone ? <> · <a href={'tel:' + o.rider.phone} style={{ color: '#0B3A23' }}>{o.rider.phone}</a></> : null}</p>}
          <div style={{ fontSize: 14, color: '#4D5A52' }}>{o.items.map((it, i) => <div key={i} style={{ padding: '6px 0', borderTop: '1px solid #F0ECE3' }}>{it.name}{it.size !== 'Package' ? ` · ${it.size}` : ''} × {it.qty}</div>)}<div style={{ padding: '8px 0 0', borderTop: '1px solid #F0ECE3', display: 'flex', justifyContent: 'space-between' }}><span>{o.area_label} · {o.speed_label}</span><strong style={{ color: '#1F2A23' }}>{naira(o.total)}</strong></div></div>
          <a href={waLink(data.business.whatsapp, `Hi Tiada, about my order ${o.id}.`)} target="_blank" rel="noopener" className="lnk" style={{ alignSelf: 'flex-start', fontSize: 14, color: '#0B3A23' }}>Question about this order? Message us</a>
        </section>
      )}
    </div>
  );
}
