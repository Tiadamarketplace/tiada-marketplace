'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShop } from '../ShopProvider';
import { Dialog } from '../Overlays';
import { naira, api, waLink, whereWeDeliver } from '@/lib/shop-client';
import { EmptyCart, Thumb, btnSolid, btnOut, field, labelStyle } from '../ui';
import { ILock } from '../Icons';

type Quote = { subtotal: number; discount: number; voucher: string | null; fee: number | null; total: number; kg: number; speed: string | null; min: number };
type Form = { name: string; phone: string; email: string; address: string; landmark: string; note: string; zone: string; speed: 'next' | 'same' | 'eco'; save: boolean };
declare global { interface Window { PaystackPop?: new () => { resumeTransaction: (code: string, cb: { onSuccess?: (t: unknown) => void; onCancel?: () => void; onError?: (e: { message?: string }) => void }) => void } } }

const SAVE_KEY = 'tiada_checkout';
const loadPaystack = () => new Promise<void>((res, rej) => {
  if (window.PaystackPop) return res();
  const s = document.createElement('script'); s.src = 'https://js.paystack.co/v2/inline.js'; s.async = true;
  s.onload = () => (window.PaystackPop ? res() : rej(new Error('no PaystackPop'))); s.onerror = () => rej(new Error('script failed'));
  document.head.appendChild(s); setTimeout(() => rej(new Error('timeout')), 12000);
});

export default function Checkout() {
  const { priced, data, user, userReady, addresses, notify, setCartOpen } = useShop();
  const router = useRouter();
  const lagos = useMemo(() => data.zones.filter(z => !z.state), [data.zones]);
  const states = useMemo(() => data.zones.filter(z => z.state), [data.zones]);
  const [step, setStep] = useState<'details' | 'pay'>('details');
  const [where, setWhere] = useState<'lagos' | 'out'>('lagos');
  const [f, setF] = useState<Form>({ name: '', phone: '', email: '', address: '', landmark: '', note: '', zone: '', speed: 'next', save: true });
  const [err, setErr] = useState<{ field?: string; text: string } | null>(null);
  const [q, setQ] = useState<Quote | null>(null);
  const [code, setCode] = useState('');
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeApplied, setCodeApplied] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [phase, setPhase] = useState<'idle' | 'opening' | 'confirming' | 'failed'>('idle');
  const [fail, setFail] = useState({ title: '', text: '' });
  const [changed, setChanged] = useState<string | null>(null);
  const loaded = useRef(false);

  // fill in what we know: saved guest details, then the signed-in account
  useEffect(() => {
    if (loaded.current) return; loaded.current = true;
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) { setF(v => ({ ...v, ...s })); if (s.zone && states.some(z => z.id === s.zone)) setWhere('out'); } } catch { /* */ }
  }, [states]);
  useEffect(() => {
    if (!user) return;
    setF(v => ({ ...v, email: user.email, name: v.name || user.name || '', phone: v.phone || user.phone || '' }));
    if (addresses[0]) setF(v => (v.address ? v : { ...v, address: addresses[0].street, landmark: addresses[0].landmark || '', zone: v.zone || addresses[0].zone_id || '' }));
  }, [user, addresses]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF(x => ({ ...x, [k]: v })); if (err?.field === k) setErr(null); };

  const items = priced.map(l => ({ pid: l.pid, size: l.size, qty: l.qty, swaps: l.swaps }));
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!items.length) return;
    let on = true;
    const t = setTimeout(() => {
      api<Quote>('/api/quote', { json: { items, zone_id: f.zone || null, speed: f.speed, voucher: codeApplied || null, email: f.email || null } })
        .then(r => on && setQ(r))
        .catch((e: Error & { status?: number }) => {
          if (!on) return;
          if (codeApplied && /code|“/.test(e.message)) { setCodeErr(e.message); setCodeApplied(''); return; }
          if (e.status === 409) setChanged(e.message);
        });
    }, 250);
    return () => { on = false; clearTimeout(t); };
  }, [itemsKey, f.zone, f.speed, codeApplied, f.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const zone = data.zones.find(z => z.id === f.zone);
  const sub = priced.reduce((a, l) => a + l.line, 0);
  // the server's quote is the real figure; until it arrives, show the area's base fee
  const estFee = zone ? zone.fee + (f.speed === 'same' ? (zone.state ? data.fees.express : data.fees.same) : 0) : null;
  const fee = q ? q.fee : estFee;
  const total = q ? q.total : sub + (estFee || 0);
  const arrive = zone ? (zone.state ? (zone.days || '2–5 working days') : f.speed === 'same' ? 'today or next morning' : `on ${zone.day || 'your area’s day'}`) : '';

  const applyCode = async () => {
    const c = code.trim().toUpperCase(); setCodeErr('');
    if (!c) return setCodeErr('Type your code first.');
    try { const r = await api<Quote>('/api/quote', { json: { items, zone_id: f.zone || null, speed: f.speed, voucher: c, email: f.email || null } }); setQ(r); setCodeApplied(c); notify('ok', `${c} applied.`, `You save ${naira(r.discount)}.`); }
    catch (e) { setCodeErr((e as Error).message); }
  };

  const toPay = () => {
    const need: [keyof Form, boolean, string][] = [
      ['name', f.name.trim().length >= 2, 'Add your full name.'],
      ['phone', /^0[789][01]\d{8}$/.test(f.phone.replace(/[\s-]/g, '').replace(/^\+?234/, '0')), 'Use an 11-digit Nigerian phone number, like 0803 000 0000.'],
      ['email', /^\S+@\S+\.\S+$/.test(f.email.trim()), 'Enter a full email address so we can send your receipt.'],
      ['zone', !!zone, where === 'lagos' ? 'Choose your area in Lagos.' : 'Choose your state.'],
      ['address', f.address.trim().length >= 6, 'Add a house number and street.'],
    ];
    const bad = need.find(n => !n[1]);
    if (bad) { setErr({ field: bad[0], text: bad[2] }); document.getElementById('co-' + bad[0])?.focus(); return; }
    if (sub < data.fees.min) { setErr({ text: `The minimum order for delivery is ${naira(data.fees.min)}. Add ${naira(data.fees.min - sub)} more.` }); return; }
    setErr(null);
    try { const { name, phone, email, address, landmark, zone: z, speed } = f; localStorage.setItem(SAVE_KEY, JSON.stringify({ name, phone, email, address, landmark, zone: z, speed })); } catch { /* */ }
    setStep('pay'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pay = async () => {
    setPhase('opening');
    let r: { order: { id: string; total: number }; ref: string; access_code: string; authorization_url: string };
    try {
      r = await api('/api/checkout', { json: { items, email: f.email.trim(), name: f.name.trim(), phone: f.phone, address: f.address.trim(), landmark: f.landmark.trim() || null, zone_id: f.zone, speed: f.speed, voucher: codeApplied || null, note: f.note.trim() || null, save_address: !!user && f.save } });
    } catch (e) {
      const m = (e as Error).message; const st = (e as { status?: number }).status;
      if (st === 409) { setPhase('idle'); setChanged(m); return; }
      setFail({ title: 'We couldn’t start your payment', text: m }); setPhase('failed'); return;
    }
    const done = () => router.push(`/order/${r.order.id}?ref=${r.ref}`);
    try {
      await loadPaystack();
      const pop = new window.PaystackPop!();
      pop.resumeTransaction(r.access_code, {
        onSuccess: () => { setPhase('confirming'); done(); },
        onCancel: () => { setFail({ title: 'Payment not finished', text: 'You closed the payment window before paying. Nothing was taken from your account. Your cart is still here.' }); setPhase('failed'); },
        onError: e => { setFail({ title: 'Payment didn’t go through', text: (e?.message ? e.message + '. ' : '') + 'Nothing was taken. Try again, or use a different card or bank.' }); setPhase('failed'); },
      });
      setPhase('idle');
    } catch {
      // the popup script couldn't load (slow network or blocked), so use Paystack's own payment page instead
      window.location.href = r.authorization_url;
    }
  };

  if (!priced.length && phase !== 'confirming') return <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px clamp(16px, 3vw, 28px) 0' }}><EmptyCart /></div>;

  const steps = [['Cart', 'done'], ['Details', step === 'details' ? 'on' : 'done'], ['Payment', step === 'pay' ? 'on' : 'off']];
  const inp = (k: keyof Form): React.CSSProperties => ({ ...field, borderColor: err?.field === k ? '#B8402B' : '#DCD6CA' });

  return (
    <div className="fade" style={{ maxWidth: 1100, margin: '0 auto', padding: '36px clamp(16px, 3vw, 28px) 0' }}>
      <ol aria-label="Checkout steps" style={{ listStyle: 'none', margin: '0 0 28px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 22px', fontSize: 13 }}>
        {steps.map(([l, st], i) => { const c = st === 'off' ? '#8B958E' : '#0B3A23'; return (
          <li key={l} aria-current={st === 'on' ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8, color: c, fontWeight: st === 'on' ? 600 : 500 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${c}`, background: st === 'done' ? '#0B3A23' : '#FFFFFF', color: st === 'done' ? '#FFFFFF' : c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{st === 'done' ? '✓' : i + 1}</span>
            {i === 0 ? <Link href="/cart" style={{ color: 'inherit', textDecoration: 'none' }}>{l}</Link> : l}
          </li>); })}
      </ol>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 540px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 30 }}>
          {step === 'details' ? (
            <form onSubmit={e => { e.preventDefault(); toPay(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
              <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <h2 style={{ margin: 0, fontWeight: 500, fontSize: 22 }}>Contact</h2>
                  {userReady && !user && <span style={{ fontSize: 13, color: '#66736B' }}>Have an account? <Link href="/account?next=/checkout" className="lnk" style={{ color: '#0B3A23' }}>Sign in</Link></span>}
                  {user && <span style={{ fontSize: 13, color: '#0B3A23', display: 'flex', alignItems: 'center', gap: 6 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: '#2E9E5B' }} />Signed in as {user.email}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <label style={labelStyle}>Full name<input id="co-name" type="text" autoComplete="name" value={f.name} onChange={e => set('name', e.target.value)} aria-invalid={err?.field === 'name'} style={inp('name')} /></label>
                  <label style={labelStyle}>Phone number<input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" value={f.phone} onChange={e => set('phone', e.target.value)} aria-invalid={err?.field === 'phone'} style={inp('phone')} /></label>
                </div>
                <label style={labelStyle}>Email for your receipt<input id="co-email" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} readOnly={!!user} aria-invalid={err?.field === 'email'} style={{ ...inp('email'), ...(user ? { background: '#F7F5F0', color: '#4D5A52' } : {}) }} /></label>
              </section>

              <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h2 style={{ margin: 0, fontWeight: 500, fontSize: 22 }}>Delivery</h2>
                <div role="tablist" aria-label="Where to deliver" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 6, background: '#F4F1EA', alignSelf: 'flex-start' }}>
                  {([['lagos', 'In Lagos'], ...(states.length ? [['out', states.length === 1 ? `${states[0].state} State` : 'Outside Lagos']] : [])] as ['lagos' | 'out', string][]).map(([k, l]) => (
                    <button key={k} type="button" role="tab" className="ub" aria-selected={where === k} onClick={() => { setWhere(k); set('zone', ''); set('speed', 'next'); }} style={{ height: 40, padding: '0 18px', borderRadius: 4, fontSize: 14, fontWeight: 600, background: where === k ? '#FFFFFF' : 'transparent', color: where === k ? '#0B3A23' : '#66736B', boxShadow: where === k ? '0 1px 3px rgba(17,32,23,0.12)' : 'none' }}>{l}</button>
                  ))}
                </div>
                {where === 'lagos' ? (
                  <div id="co-zone" tabIndex={-1} role="radiogroup" aria-label="Your area" style={{ display: 'flex', flexDirection: 'column', gap: 8, outline: err?.field === 'zone' ? '1.5px solid #B8402B' : 'none', borderRadius: 6 }}>
                    {lagos.map(z => { const on = f.zone === z.id; return (
                      <button key={z.id} type="button" className="ub opt" role="radio" aria-checked={on} onClick={() => set('zone', z.id)} style={{ minHeight: 60, padding: '10px 16px', borderRadius: 6, border: `1.5px solid ${on ? '#0B3A23' : '#E2DDD0'}`, background: on ? '#F1F5F1' : '#FFFFFF', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ width: 18, height: 18, flex: 'none', borderRadius: '50%', border: on ? '5.5px solid #0B3A23' : '1.5px solid #B9B3A5' }} />
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14.5, fontWeight: 500 }}>{z.label}</span><span style={{ fontSize: 12.5, color: '#66736B' }}>{z.day ? `Delivered on ${z.day}` : 'Delivery day confirmed after you order'}</span></span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{naira(z.fee)}</span>
                      </button>); })}
                    <p style={{ margin: 0, fontSize: 12.5, color: '#66736B' }}>Can’t see your area? <a href={waLink(data.business.whatsapp, 'Hi Tiada, do you deliver to my area?')} target="_blank" rel="noopener" className="lnk" style={{ color: '#0B3A23' }}>Ask us on WhatsApp</a>.</p>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#4D5A52' }}>Outside Lagos we deliver to {whereWeDeliver(states).replace(/^Lagos(, | and )/, '')} only, by courier. We email you the tracking number once it’s on the way.</p>
                    <div id="co-zone" tabIndex={-1} role="radiogroup" aria-label="Your state" style={{ display: 'flex', flexDirection: 'column', gap: 8, outline: err?.field === 'zone' ? '1.5px solid #B8402B' : 'none', borderRadius: 6 }}>
                      {states.map(z => { const on = f.zone === z.id; return (
                        <button key={z.id} type="button" className="ub opt" role="radio" aria-checked={on} onClick={() => set('zone', z.id)} style={{ minHeight: 60, padding: '10px 16px', borderRadius: 6, border: `1.5px solid ${on ? '#0B3A23' : '#E2DDD0'}`, background: on ? '#F1F5F1' : '#FFFFFF', display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span style={{ width: 18, height: 18, flex: 'none', borderRadius: '50%', border: on ? '5.5px solid #0B3A23' : '1.5px solid #B9B3A5' }} />
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14.5, fontWeight: 500 }}>{z.label || z.state}</span><span style={{ fontSize: 12.5, color: '#66736B' }}>By courier · {z.days || '1–3 days'}</span></span>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{naira(z.fee)}</span>
                        </button>); })}
                    </div>
                  </>
                )}
                {zone && (
                  <div role="radiogroup" aria-label="Delivery speed" className="fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
                    {([['next', zone.state ? 'Standard courier' : 'Standard', zone.state ? (zone.days || '2–5 working days') : `On ${zone.day || 'your area’s day'}`, 0], ['same', zone.state ? 'Express courier' : 'Priority', zone.state ? 'Faster, where the courier offers it' : 'Today or next morning', zone.state ? data.fees.express : data.fees.same]] as const).map(([k, l, d, extra]) => { const on = f.speed === k; return (
                      <button key={k} type="button" className="ub opt" role="radio" aria-checked={on} onClick={() => set('speed', k)} style={{ padding: '12px 14px', borderRadius: 6, border: `1.5px solid ${on ? '#0B3A23' : '#E2DDD0'}`, background: on ? '#F1F5F1' : '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}><span>{l}</span><span>{extra ? '+' + naira(extra) : ''}</span></span>
                        <span style={{ fontSize: 12.5, color: '#66736B' }}>{d}</span>
                      </button>); })}
                  </div>
                )}
                {addresses.length > 1 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {addresses.map(a => <button key={a.id} type="button" className="ub chip" onClick={() => { set('address', a.street); set('landmark', a.landmark || ''); if (a.zone_id) set('zone', a.zone_id); }} style={{ height: 34, padding: '0 12px', borderRadius: 999, border: '1px solid #DCD6CA', fontSize: 12.5 }}>{a.label}: {a.street.slice(0, 28)}</button>)}
                  </div>
                )}
                <label style={labelStyle}>Street address<input id="co-address" type="text" autoComplete="street-address" placeholder="House number, street, estate" value={f.address} onChange={e => set('address', e.target.value)} aria-invalid={err?.field === 'address'} style={inp('address')} /></label>
                <label style={labelStyle}><span>Nearest landmark <span style={{ fontWeight: 400, color: '#66736B' }}>(optional)</span></span><input type="text" value={f.landmark} onChange={e => set('landmark', e.target.value)} placeholder="e.g. opposite the filling station" style={field} /></label>
                <label style={labelStyle}><span>Note for us <span style={{ fontWeight: 400, color: '#66736B' }}>(optional)</span></span><textarea rows={2} value={f.note} onChange={e => set('note', e.target.value)} maxLength={300} placeholder="Gate code, best time to call…" style={{ ...field, height: 'auto', padding: '12px 14px', resize: 'vertical' }} /></label>
                {user && <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}><input type="checkbox" checked={f.save} onChange={e => set('save', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#0B3A23' }} />Save this address to my account</label>}
              </section>
              {err && <p role="alert" className="shake" style={{ margin: 0, padding: '12px 14px', borderRadius: 6, background: '#F8E6E1', color: '#7A2A1B', fontSize: 14, fontWeight: 500 }}>{err.text}</p>}
              <button type="submit" className="ub btn-solid press" style={btnSolid}>Continue to payment</button>
            </form>
          ) : (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ margin: 0, fontWeight: 500, fontSize: 22 }}>Payment</h2>
              <div style={{ padding: '14px 16px', borderRadius: 6, border: '1px solid #ECE8DF', display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13.5, lineHeight: 1.5, minWidth: 0 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#66736B' }}>Delivering to</span>
                  <span style={{ fontWeight: 600 }}>{f.name} · {f.phone}</span>
                  <span>{f.address}, {zone?.state || zone?.label}</span>
                  <span style={{ color: '#66736B' }}>Arrives {arrive}</span>
                </span>
                <button type="button" className="ub lnk" onClick={() => { setStep('details'); setPhase('idle'); }} style={{ alignSelf: 'flex-start', fontSize: 13.5, color: '#0B3A23' }}>Change</button>
              </div>

              {phase === 'failed' && (
                <div role="alert" className="fade" style={{ padding: 18, borderRadius: 8, background: '#FBEFEB', border: '1px solid #F0D3CA', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><strong style={{ fontSize: 15, fontWeight: 600, color: '#7A2A1B' }}>{fail.title}</strong><span style={{ fontSize: 14, lineHeight: 1.6, color: '#5C3A30' }}>{fail.text}</span></span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button type="button" className="ub btn-solid press" onClick={pay} style={{ ...btnSolid, height: 46, fontSize: 14 }}>Try again · {naira(total)}</button>
                    <a href={waLink(data.business.whatsapp, 'Hi Tiada, I had a problem paying for my order.')} target="_blank" rel="noopener" className="btn-out" style={{ ...btnOut, height: 46, fontSize: 14 }}>Get help on WhatsApp</a>
                  </div>
                </div>
              )}
              {phase === 'confirming' && (
                <div role="status" className="fade" style={{ padding: 26, borderRadius: 8, background: '#FBF9F4', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #E6E0D2', borderTopColor: '#0B3A23', animation: 'spin .9s linear infinite' }} />
                  <strong style={{ fontSize: 16, fontWeight: 600 }}>Confirming your payment…</strong>
                  <span style={{ fontSize: 14, color: '#66736B' }}>This takes a few seconds. Please don’t close this page.</span>
                </div>
              )}
              {(phase === 'idle' || phase === 'opening') && (
                <div className="fade" style={{ border: '1px solid #ECE8DF', borderRadius: 8, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 16, fontWeight: 600 }}>Pay online · {naira(total)}</span><span style={{ fontSize: 12.5, color: '#66736B', display: 'flex', alignItems: 'center', gap: 6 }}><ILock size={14} />Secured by Paystack</span></div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#4D5A52' }}>Pay whichever way suits you in Paystack’s secure window. Your order confirms on its own once payment goes through.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{['Card', 'Bank transfer', 'USSD', 'Visa', 'Mastercard', 'Verve'].map(t => <span key={t} style={{ padding: '5px 10px', borderRadius: 3, border: '1px solid #E2DDD0', fontSize: 12 }}>{t}</span>)}</div>
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.75, color: '#4D5A52' }}><li>Tap the button below. Paystack’s secure window opens over this page.</li><li>Choose card, bank transfer or USSD and finish the payment.</li><li>You come straight back here with your order confirmed and a tracking code.</li></ol>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#66736B', display: 'flex', gap: 8 }}><ILock size={14} />Your payment details go straight to Paystack. Tiada never sees or stores your card number.</p>
                  <button type="button" className="ub btn-solid press" disabled={phase === 'opening'} onClick={pay} style={{ ...btnSolid, opacity: phase === 'opening' ? 0.7 : 1 }}>
                    {phase === 'opening' ? <><span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#FFFFFF', animation: 'spin .8s linear infinite' }} />Opening secure payment…</> : <><ILock size={17} />Pay {naira(total)} securely</>}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        <aside aria-label="Order summary" style={{ flex: '1 1 320px', background: '#FBF9F4', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {priced.map(it => (
            <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Thumb pid={it.pid} size={58} qty={it.qty} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{it.product.name}</span><span style={{ fontSize: 12.5, color: '#66736B' }}>{it.size}{it.swaps?.length ? ' · swaps' : ''}</span></span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{naira(it.line)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: '#E4DFD3' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5 }}><span>Subtotal</span><span>{naira(q?.subtotal ?? sub)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5 }}><span>Delivery{q?.speed ? <span style={{ fontSize: 12, color: '#66736B' }}> · {q.speed}</span> : null}</span><span>{fee != null ? naira(fee) : <span style={{ color: '#66736B', fontSize: 13 }}>Choose your area</span>}</span></div>
          {!!q?.discount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14.5, color: '#0B3A23' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Discount <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 4, border: '1px dashed #D49B41', background: '#FFFFFF' }}>{q.voucher}</span>
                {step === 'details' && <button type="button" className="ub quiet" aria-label="Remove code" onClick={() => { setCodeApplied(''); setCode(''); }} style={{ fontSize: 12, color: '#66736B', textDecoration: 'underline' }}>Remove</button>}</span>
              <span>−{naira(q.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px solid #E4DFD3' }}><span style={{ fontSize: 16, fontWeight: 600 }}>Total</span><span style={{ fontSize: 24, fontWeight: 600 }}>{naira(total)}</span></div>
          {step === 'details' && !codeApplied && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              {!codeOpen ? <button type="button" className="ub" onClick={() => setCodeOpen(true)} style={{ alignSelf: 'flex-start', fontSize: 13.5, fontWeight: 600, color: '#0B3A23', textDecoration: 'underline', textUnderlineOffset: 4, minHeight: 32 }}>Have a discount code?</button> : (
                <>
                  <form onSubmit={e => { e.preventDefault(); applyCode(); }} style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={code} onChange={e => { setCode(e.target.value); setCodeErr(''); }} placeholder="Discount code" aria-label="Discount code" autoFocus style={{ flex: 1, height: 46, padding: '0 14px', borderRadius: 4, border: `1px solid ${codeErr ? '#B8402B' : '#DCD6CA'}`, fontSize: 14.5, minWidth: 0, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#FFFFFF' }} />
                    <button type="submit" className="ub btn-out" style={{ ...btnOut, height: 46, padding: '0 18px', fontSize: 14 }}>Apply</button>
                  </form>
                  {codeErr && <span role="alert" className="shake" style={{ fontSize: 13, fontWeight: 600, color: '#9E3522' }}>{codeErr}</span>}
                </>
              )}
            </div>
          )}
        </aside>
      </div>
      {changed && <Dialog title="Your cart needs a quick change" text={changed} noLabel="Close" yesLabel="Check my cart" onNo={() => setChanged(null)} onYes={() => { setChanged(null); setCartOpen(true); }} />}
    </div>
  );
}
