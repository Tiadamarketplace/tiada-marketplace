'use client';
import { useState } from 'react';
import { useShop } from '../ShopProvider';
import { api, naira, waLink } from '@/lib/shop-client';
import { H1, btnSolid, field, labelStyle } from '../ui';

const FAQ: [string, string][] = [
  ['How do I order?', 'Pick a product, choose its size and tap Add to cart. Combos go in as one package. When you’re ready, open your cart and check out. You don’t need an account.'],
  ['How do combo swaps work?', 'Open any combo and use the menus under “What’s inside” to swap an item, for example Beans for Spaghetti. The price stays the same and our packers see your swaps.'],
  ['How do I pay?', 'At checkout, tap Pay securely and Paystack’s window opens. Pay by card, bank transfer or USSD, and your order confirms on its own. Tiada never sees your card details.'],
  ['When will my order arrive?', 'We deliver in Lagos and Oyo State for now. Every Lagos area has a delivery day, shown below and at checkout before you pay. Oyo orders go by courier and we email you the tracking number.'],
  ['How do I track my order?', 'Type the TD code from your confirmation email on the Track page. If you have an account, your orders are under My account.'],
  ['Something is wrong with my order', 'Message us within 24 hours with a photo and your TD code. We’ll replace the item or refund you.'],
];
export default function Help() {
  const { data, notify } = useShop();
  const b = data.business;
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  const [m, setM] = useState({ name: '', email: '', phone: '', text: '' });
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const lagos = data.zones.filter(z => !z.state);
  const send = async () => {
    setErr(''); setBusy(true);
    try { await api('/api/contact', { json: { ...m, phone: m.phone || null } }); setSent(true); notify('ok', 'Message sent.', 'We’ll reply by email.'); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto', padding: '48px clamp(16px, 3vw, 28px) 0', display: 'flex', flexDirection: 'column', gap: 56 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
        <H1>How Tiada works</H1>
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.7, color: '#4D5A52' }}>We buy cereals, milk and foodstuffs in bulk, pack them by weight into clean sealed bags at our Agege hub, and deliver across Lagos on a set day for each area. We also deliver to Oyo State by courier.</p>
      </div>
      <section aria-labelledby="faq-h">
        <h2 id="faq-h" style={{ margin: '0 0 12px', fontWeight: 500, fontSize: 24 }}>Questions</h2>
        <div style={{ borderTop: '1px solid #ECE8DF' }}>
          {FAQ.map(([q, a], i) => (
            <div key={q} style={{ borderBottom: '1px solid #ECE8DF' }}>
              <button type="button" className="ub" aria-expanded={!!open[i]} onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))} style={{ width: '100%', minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, textAlign: 'left', fontSize: 15, fontWeight: 600 }}>{q}<span aria-hidden="true" style={{ fontSize: 20, fontWeight: 400, transition: 'transform .2s', transform: `rotate(${open[i] ? 45 : 0}deg)` }}>+</span></button>
              {open[i] && <p className="fade" style={{ margin: '0 0 18px', fontSize: 14.5, lineHeight: 1.75, color: '#4D5A52', maxWidth: 720 }}>{a}</p>}
            </div>
          ))}
        </div>
      </section>
      <section id="delivery" aria-labelledby="del-h" style={{ scrollMarginTop: 140 }}>
        <h2 id="del-h" style={{ margin: '0 0 6px', fontWeight: 500, fontSize: 24 }}>Where and when we deliver</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#66736B' }}>Order before the day before to make your area’s run. Fees can change with weight; your exact fee shows at checkout.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
          {lagos.map(z => <div key={z.id} style={{ padding: '14px 16px', borderRadius: 8, background: '#FBF9F4', display: 'flex', flexDirection: 'column', gap: 4 }}><strong style={{ fontSize: 14, fontWeight: 600 }}>{z.label}</strong><span style={{ fontSize: 13, color: '#4D5A52' }}>{z.day || 'Day confirmed after you order'} · {naira(z.fee)}</span></div>)}
        </div>
        {data.zones.some(z => z.state) && <>
          <h3 style={{ margin: '24px 0 10px', fontWeight: 600, fontSize: 17 }}>Outside Lagos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
            {(() => {
              // group Oyo areas (Ibadan, other towns) and any other states into one card each
              const groups: Record<string, { label: string; fees: number[]; days: string; n: number }> = {};
              for (const z of data.zones.filter(x => x.state)) {
                const k = z.id.startsWith('oyo:') ? `${z.state}: ${z.city}` : z.id;
                const g = (groups[k] ||= { label: z.id.startsWith('oyo:') ? (z.city === 'Ibadan' ? 'Ibadan, Oyo State' : `${z.city}, Oyo State`) : z.label || z.state || '', fees: [], days: z.days || '1–3 days', n: 0 });
                g.fees.push(z.fee); g.n++;
              }
              return Object.entries(groups).map(([k, g]) => <div key={k} style={{ padding: '14px 16px', borderRadius: 8, background: '#FBF9F4', display: 'flex', flexDirection: 'column', gap: 4 }}><strong style={{ fontSize: 14, fontWeight: 600 }}>{g.label}</strong><span style={{ fontSize: 13, color: '#4D5A52' }}>{g.n > 1 ? `${g.n} areas · ` : ''}{g.days} · from {naira(Math.min(...g.fees))}</span></div>);
            })()}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#66736B' }}>We don’t deliver to other states yet.</p>
        </>}
        {data.policies.delivery && <p style={{ margin: '16px 0 0', fontSize: 14, lineHeight: 1.7, color: '#4D5A52' }}>{data.policies.delivery}</p>}
      </section>
      <section id="contact" aria-labelledby="ct-h" style={{ scrollMarginTop: 140, display: 'flex', flexWrap: 'wrap', gap: 40 }}>
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="ct-h" style={{ margin: 0, fontWeight: 500, fontSize: 24 }}>Contact us</h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: '#4D5A52' }}>The fastest way is WhatsApp. You can also send a message here and we’ll reply by email.</p>
          <a href={waLink(b.whatsapp)} target="_blank" rel="noopener" style={{ fontSize: 15, fontWeight: 600, color: '#0B3A23' }}>WhatsApp {b.phone}</a>
          <a href={'mailto:' + b.email} style={{ fontSize: 14.5, color: '#0B3A23' }}>{b.email}</a>
          <span style={{ fontSize: 14, lineHeight: 1.6, color: '#66736B' }}>{b.address}</span>
        </div>
        <div style={{ flex: '999 1 400px' }}>
          {sent ? <p className="pop" role="status" style={{ margin: 0, padding: 22, borderRadius: 8, background: '#E6EEE8', color: '#0B3A23', fontSize: 15, lineHeight: 1.6 }}><strong>Thanks, {m.name.split(' ')[0]}.</strong> Your message is with us and we’ll reply to {m.email}.</p> : (
            <form onSubmit={e => { e.preventDefault(); send(); }} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <label style={labelStyle}>Name<input value={m.name} onChange={e => setM({ ...m, name: e.target.value })} autoComplete="name" style={field} /></label>
              <label style={labelStyle}>Email<input type="email" value={m.email} onChange={e => setM({ ...m, email: e.target.value })} autoComplete="email" style={field} /></label>
              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Phone (optional)<input type="tel" value={m.phone} onChange={e => setM({ ...m, phone: e.target.value })} style={field} /></label>
              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Message<textarea rows={5} value={m.text} onChange={e => setM({ ...m, text: e.target.value })} maxLength={1500} style={{ ...field, height: 'auto', padding: '12px 14px', resize: 'vertical' }} /></label>
              {err && <p role="alert" className="shake" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
              <button type="submit" disabled={busy} className="ub btn-solid press" style={{ ...btnSolid, gridColumn: '1 / -1', opacity: busy ? 0.7 : 1 }}>{busy ? 'Sending…' : 'Send message'}</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
