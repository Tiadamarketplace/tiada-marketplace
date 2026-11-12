'use client';
import Link from '@/components/shop/Link';

import { useEffect, useRef, useState } from 'react';
import { useShop } from '../ShopProvider';
import { Dialog } from '../Overlays';
import { naira, api, waLink, whereWeDeliver } from '@/lib/shop-client';
import { Box, BoxArea, BoxSelect, EmptyCart, Thumb, btnSolid, btnOut, Spin } from '../ui';
import { ILock } from '../Icons';
import AddressSearch, { Pick, PlaceRef } from '../AddressSearch';

type Quote = { subtotal: number; discount: number; voucher: string | null; fee: number | null; total: number; kg: number; speed: string | null; min: number; days: string | null; area: string | null; reason: string | null };
type Form = { name: string; phone: string; email: string; address: string; landmark: string; city: string; state: string; note: string; place: PlaceRef | null; speed: 'next' | 'same'; save: boolean };
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
  const [step, setStep] = useState<'details' | 'pay'>('details');
  const [f, setF] = useState<Form>({ name: '', phone: '', email: '', address: '', landmark: '', city: '', state: 'Lagos', note: '', place: null, speed: 'next', save: true });
  const [spot, setSpot] = useState<Pick | null>(null);
  const [start, setStart] = useState<{ text: string; place: PlaceRef | null } | null>(null);
  const [addrKey, setAddrKey] = useState(0);
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
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) { setF(v => ({ ...v, ...s, speed: s.speed === 'same' ? 'same' : 'next', place: null })); if (s.place && s.address) setStart({ text: s.address, place: s.place }); } } catch { /* */ }
  }, []);
  useEffect(() => {
    if (!user) return;
    setF(v => ({ ...v, email: user.email, name: v.name || user.name || '', phone: v.phone || user.phone || '' }));
    const a = addresses[0];
    if (a?.spot?.place && !f.address) { setStart({ text: a.street, place: { id: a.spot.place, lat: a.spot.lat, lng: a.spot.lng } }); setF(v => ({ ...v, landmark: v.landmark || a.landmark || '' })); }
  }, [user, addresses]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF(x => ({ ...x, [k]: v })); if (err?.field === k) setErr(null); };

  const items = priced.map(l => ({ pid: l.pid, size: l.size, qty: l.qty, swaps: l.swaps }));
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!items.length) return;
    let on = true;
    const t = setTimeout(() => {
      api<Quote>('/api/quote', { json: { items, place: f.place, speed: f.speed, voucher: codeApplied || null, email: f.email || null } })
        .then(r => on && setQ(r))
        .catch((e: Error & { status?: number }) => {
          if (!on) return;
          if (codeApplied && /code|“/.test(e.message)) { setCodeErr(e.message); setCodeApplied(''); return; }
          if (e.status === 409) setChanged(e.message);
        });
    }, 250);
    return () => { on = false; clearTimeout(t); };
  }, [itemsKey, f.place?.id, f.place?.lat, f.speed, codeApplied, f.email]); // eslint-disable-line react-hooks/exhaustive-deps
  // guests: once a full email is typed, keep a copy of the cart for one reminder email if they don't finish
  const { cart } = useShop();
  useEffect(() => {
    if (user || !/^\S+@\S+\.\S+$/.test(f.email.trim()) || !cart.length) return;
    const t = setTimeout(() => api('/api/cart', { json: { items: cart, email: f.email.trim(), name: f.name.trim() || undefined } }).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [f.email, itemsKey, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const sub = priced.reduce((a, l) => a + l.line, 0);
  const good = spot?.ok ? spot : null;
  // the server's quote is the real figure; until it arrives, show the address's base fee
  const estFee = good ? good.fee + (f.speed === 'same' ? data.fees.same : 0) : null;
  const fee = q && f.place ? q.fee : estFee;
  const total = q ? q.total : sub + (estFee || 0);
  const arrive = q?.days || (good ? (f.speed === 'same' ? 'today or next morning where we can' : good.days) : '');
  // the picked address decides the state; the city fills itself in (they can change it)
  const onPick = (p: Pick | null, text: string) => { setSpot(p); setF(x => ({ ...x, address: text, place: p?.ok ? p.place : null, ...(p?.ok ? { state: p.state || x.state, city: p.city || x.city } : {}) })); if (err?.field === 'address') setErr(null); };
  // what the rider reads: the address, plus the city and state if the address doesn't already say them
  const fullAddress = () => { let a = f.address.trim(); for (const x of [f.city.trim(), f.state]) if (x && !a.toLowerCase().includes(x.toLowerCase())) a += ', ' + x; return a; };

  const [codeBusy, setCodeBusy] = useState(false);
  const [contBusy, setContBusy] = useState(false);
  const applyCode = async () => {
    const c = code.trim().toUpperCase(); setCodeErr('');
    if (!c) return setCodeErr('Type your code first.');
    if (codeBusy) return; setCodeBusy(true);
    try { const r = await api<Quote>('/api/quote', { json: { items, place: f.place, speed: f.speed, voucher: c, email: f.email || null } }); setQ(r); setCodeApplied(c); notify('ok', `${c} applied.`, `You save ${naira(r.discount)}.`); }
    catch (e) { setCodeErr((e as Error).message); } finally { setCodeBusy(false); }
  };

  const toPay = async () => {
    if (contBusy) return;
    const need: [keyof Form, boolean, string][] = [
      ['name', f.name.trim().length >= 2, 'Add your full name.'],
      ['phone', /^0[789][01]\d{8}$/.test(f.phone.replace(/[\s-]/g, '').replace(/^\+?234/, '0')), 'Use an 11-digit Nigerian phone number, like 0803 000 0000.'],
      ['email', /^\S+@\S+\.\S+$/.test(f.email.trim()), 'Enter a full email address so we can send your receipt.'],
      ['address', !!good && !!f.place, spot && !spot.ok ? spot.reason : 'Type your address and pick it from the suggestions, so we can work out delivery.'],
    ];
    const bad = need.find(n => !n[1]);
    if (bad) { setErr({ field: bad[0], text: bad[2] }); document.getElementById('co-' + bad[0])?.focus(); return; }
    if (sub < data.fees.min) { setErr({ text: `The minimum order for delivery is ${naira(data.fees.min)}. Add ${naira(data.fees.min - sub)} more.` }); return; }
    setErr(null);
    try { const { name, phone, email, address, landmark, city, state, place, speed } = f; localStorage.setItem(SAVE_KEY, JSON.stringify({ name, phone, email, address, landmark, city, state, place: place ? { id: place.id, lat: place.lat, lng: place.lng } : null, speed })); } catch { /* */ }
    // one last check of prices, stock and the delivery fee before the payment step
    setContBusy(true); const t0 = Date.now();
    try { const r = await api<Quote>('/api/quote', { json: { items, place: f.place, speed: f.speed, voucher: codeApplied || null, email: f.email || null } }); setQ(r); }
    catch (e) { setContBusy(false); setErr({ text: (e as Error).message }); return; }
    const rest = 500 - (Date.now() - t0); if (rest > 0) await new Promise(res => setTimeout(res, rest));
    setContBusy(false);
    setStep('pay'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pay = async () => {
    setPhase('opening');
    let r: { order: { id: string; total: number }; ref: string; access_code: string; authorization_url: string };
    try {
      r = await api('/api/checkout', { json: { items, email: f.email.trim(), name: f.name.trim(), phone: f.phone, address: fullAddress(), landmark: f.landmark.trim() || null, place: f.place, speed: f.speed, voucher: codeApplied || null, note: f.note.trim() || null, save_address: !!user && f.save } });
    } catch (e) {
      const m = (e as Error).message; const st = (e as { status?: number }).status;
      if (st === 409) { setPhase('idle'); setChanged(m); return; }
      setFail({ title: 'We couldn’t start your payment', text: m }); setPhase('failed'); return;
    }
    const done = () => window.location.assign(`/order/${r.order.id}?ref=${r.ref}`);
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

  return (
    <div className="fade" style={{ maxWidth: 1100, margin: '0 auto', padding: '36px clamp(16px, 3vw, 28px) 0' }}>
      <ol aria-label="Checkout steps" style={{ listStyle: 'none', margin: '0 0 28px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 22px', fontSize: 13 }}>
        {steps.map(([l, st], i) => { const c = st === 'off' ? '#66736B' : '#0B3A23'; return (
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
                  {userReady && !user && <span style={{ fontSize: 13, color: '#4E5A53' }}>Have an account? <Link href="/account?next=/checkout" className="lnk" style={{ color: '#0B3A23' }}>Sign in</Link></span>}
                  {user && <span style={{ fontSize: 13, color: '#0B3A23', display: 'flex', alignItems: 'center', gap: 6 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: '#2E9E5B' }} />Signed in as {user.email}</span>}
                </div>
                <Box id="co-name" label="Full name" type="text" autoComplete="name" value={f.name} onChange={e => set('name', e.target.value)} bad={err?.field === 'name'} />
                <Box id="co-phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={e => set('phone', e.target.value)} bad={err?.field === 'phone'} />
                <Box id="co-email" label="Email for your receipt" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} readOnly={!!user} bad={err?.field === 'email'} />
              </section>

              <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h2 style={{ margin: 0, fontWeight: 500, fontSize: 22 }}>Delivery</h2>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#3C4741' }}>We deliver in {whereWeDeliver(data.zones)}. Choose your state, start typing your address and pick it from the list. The delivery fee depends on the distance.</p>
                {addresses.some(a => a.spot?.place) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {addresses.filter(a => a.spot?.place).map(a => <button key={a.id} type="button" className="ub chip" onClick={() => { set('landmark', a.landmark || ''); setStart({ text: a.street, place: { id: a.spot!.place, lat: a.spot!.lat, lng: a.spot!.lng } }); }} style={{ height: 34, padding: '0 12px', borderRadius: 999, border: '1px solid #DCD6CA', fontSize: 12.5 }}>{a.label}: {a.street.slice(0, 28)}</button>)}
                  </div>
                )}
                <BoxSelect label="State" value={f.state} onChange={e => { const v = e.target.value; set('state', v); if (spot && spot.ok && spot.state !== v) { setSpot(null); setStart(null); setF(x => ({ ...x, address: '', city: '', place: null })); setAddrKey(k => k + 1); } }}>
                  {data.zones.map(z => <option key={z.id} value={z.state || z.label}>{z.state || z.label}</option>)}
                </BoxSelect>
                <AddressSearch key={`${start?.text || 'new'}-${addrKey}`} id="co-address" boxLabel="Address" state={f.state} initial={start} onPick={onPick} invalid={err?.field === 'address'} />
                <Box label="Apartment, house number or landmark (optional)" type="text" value={f.landmark} onChange={e => set('landmark', e.target.value)} maxLength={120} />
                <Box label="City or town" type="text" autoComplete="address-level2" value={f.city} onChange={e => set('city', e.target.value)} maxLength={60} />
                {good && (
                  <div role="radiogroup" aria-label="Delivery speed" className="fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
                    {([['next', 'Standard', `Usually ${good.days}`, 0], ['same', 'Priority', 'Today or next morning where we can', data.fees.same]] as const).map(([k, l, d, extra]) => { const on = f.speed === k; return (
                      <button key={k} type="button" className="ub opt" role="radio" aria-checked={on} onClick={() => set('speed', k)} style={{ padding: '12px 14px', borderRadius: 6, border: `1.5px solid ${on ? '#0B3A23' : '#E2DDD0'}`, background: on ? '#F1F5F1' : '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}><span>{l}</span><span>{extra ? '+' + naira(extra) : ''}</span></span>
                        <span style={{ fontSize: 12.5, color: '#4E5A53' }}>{d}</span>
                      </button>); })}
                  </div>
                )}
                <BoxArea label="Note for us (optional): gate code, best time to call…" rows={2} value={f.note} onChange={e => set('note', e.target.value)} maxLength={300} />
                {user && <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}><input type="checkbox" checked={f.save} onChange={e => set('save', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#0B3A23' }} />Save this address to my account</label>}
              </section>
              {err && <p role="alert" className="shake" style={{ margin: 0, padding: '12px 14px', borderRadius: 6, background: '#F8E6E1', color: '#7A2A1B', fontSize: 14, fontWeight: 500 }}>{err.text}</p>}
              <button type="submit" className="ub btn-solid press" disabled={contBusy} aria-busy={contBusy} style={{ ...btnSolid, gap: 10 }}>{contBusy ? <><Spin />Checking your order…</> : 'Continue to payment'}</button>
            </form>
          ) : (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ margin: 0, fontWeight: 500, fontSize: 22 }}>Payment</h2>
              <div style={{ padding: '14px 16px', borderRadius: 6, border: '1px solid #ECE8DF', display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13.5, lineHeight: 1.5, minWidth: 0 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4E5A53' }}>Delivering to</span>
                  <span style={{ fontWeight: 600 }}>{f.name} · {f.phone}</span>
                  <span>{fullAddress()}</span>{f.landmark.trim() && <span style={{ color: '#4E5A53' }}>{f.landmark.trim()}</span>}
                  <span style={{ color: '#4E5A53' }}>Arrives {arrive}</span>
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
                  <span style={{ fontSize: 14, color: '#4E5A53' }}>This takes a few seconds. Please don’t close this page.</span>
                </div>
              )}
              {(phase === 'idle' || phase === 'opening') && (
                <div className="fade" style={{ border: '1px solid #ECE8DF', borderRadius: 8, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 16, fontWeight: 600 }}>Pay online · {naira(total)}</span><span style={{ fontSize: 12.5, color: '#4E5A53', display: 'flex', alignItems: 'center', gap: 6 }}><ILock size={14} />Secured by Paystack</span></div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#3C4741' }}>Pay whichever way suits you in Paystack’s secure window. Your order confirms on its own once payment goes through.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{['Card', 'Bank transfer', 'USSD', 'Visa', 'Mastercard', 'Verve'].map(t => <span key={t} style={{ padding: '5px 10px', borderRadius: 3, border: '1px solid #E2DDD0', fontSize: 12 }}>{t}</span>)}</div>
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.75, color: '#3C4741' }}><li>Tap the button below. Paystack’s secure window opens over this page.</li><li>Choose card, bank transfer or USSD and finish the payment.</li><li>You come straight back here with your order confirmed and a tracking code.</li></ol>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#4E5A53', display: 'flex', gap: 8 }}><ILock size={14} />Your payment details go straight to Paystack. Tiada never sees or stores your card number.</p>
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
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{it.product.name}</span><span style={{ fontSize: 12.5, color: '#4E5A53' }}>{it.size}{it.swaps?.length ? ' · swaps' : ''}</span></span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{naira(it.line)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: '#E4DFD3' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5 }}><span>Subtotal</span><span>{naira(q?.subtotal ?? sub)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5 }}><span>Delivery{q?.speed ? <span style={{ fontSize: 12, color: '#4E5A53' }}> · {q.speed}</span> : null}</span><span>{fee != null ? naira(fee) : <span style={{ color: '#4E5A53', fontSize: 13 }}>Add your address</span>}</span></div>
          {!!q?.discount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14.5, color: '#0B3A23' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Discount <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 4, border: '1px dashed #D49B41', background: '#FFFFFF' }}>{q.voucher}</span>
                {step === 'details' && <button type="button" className="ub quiet" aria-label="Remove code" onClick={() => { setCodeApplied(''); setCode(''); }} style={{ fontSize: 12, color: '#4E5A53', textDecoration: 'underline' }}>Remove</button>}</span>
              <span>−{naira(q.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px solid #E4DFD3' }}><span style={{ fontSize: 16, fontWeight: 600 }}>Total</span><span style={{ fontSize: 24, fontWeight: 600 }}>{naira(total)}</span></div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: '#4E5A53' }}>Items arrive repacked in sealed Tiada bags, unless the size says tin or sealed pack.</p>
          {step === 'details' && !codeApplied && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              {!codeOpen ? <button type="button" className="ub" onClick={() => setCodeOpen(true)} style={{ alignSelf: 'flex-start', fontSize: 13.5, fontWeight: 600, color: '#0B3A23', textDecoration: 'underline', textUnderlineOffset: 4, minHeight: 32 }}>Have a discount code?</button> : (
                <>
                  <form onSubmit={e => { e.preventDefault(); applyCode(); }} style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={code} onChange={e => { setCode(e.target.value); setCodeErr(''); }} placeholder="Discount code" aria-label="Discount code" autoFocus style={{ flex: 1, height: 46, padding: '0 14px', borderRadius: 4, border: `1px solid ${codeErr ? '#B8402B' : '#DCD6CA'}`, fontSize: 14.5, minWidth: 0, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#FFFFFF' }} />
                    <button type="submit" className="ub btn-out" disabled={codeBusy} aria-busy={codeBusy} style={{ ...btnOut, height: 46, padding: '0 18px', fontSize: 14, gap: 8 }}>{codeBusy ? <><Spin dark />Checking…</> : 'Apply'}</button>
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
