'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useShop, Address } from '../ShopProvider';
import { Dialog } from '../Overlays';
import OrderSteps, { StatusPill } from '../OrderSteps';
import { naira, api, lineKey, CartLine, waLink } from '@/lib/shop-client';
import { H1, btnSolid, btnOut, field, labelStyle } from '../ui';

type OItem = { pid: string; name: string; size: string; qty: number; price: number; swaps?: { from: string; to: string }[] };
type Order = { id: string; status: string; total: number; delivery_fee: number; discount: number; created_at: string; address: string; area_label: string | null; speed_label: string | null; items: OItem[]; rider: { partner?: string; tracking?: string; driver?: string; phone?: string } | null; issue: { reason?: string; note?: string; eta?: string } | null };
const date = (s: string) => new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Account({ next }: { next: string }) {
  const { user, userReady } = useShop();
  if (!userReady) return <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px clamp(16px, 3vw, 28px)' }}><div className="skel" style={{ height: 40, width: 260, borderRadius: 4 }} /><div className="skel" style={{ height: 180, marginTop: 24, borderRadius: 8 }} /></div>;
  return user ? <Signed /> : <SignIn next={next} />;
}

function SignIn({ next }: { next: string }) {
  const { refreshUser, notify } = useShop();
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [promo, setPromo] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const send = async () => {
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Enter a full email address, like name@gmail.com.');
    setBusy(true);
    try { const r = await api<{ devNote?: string }>('/api/auth/start', { json: { email: email.trim() } }); setStep('code'); setWait(45); setDigits(['', '', '', '', '', '']); setTimeout(() => boxes.current[0]?.focus(), 50); if (r.devNote) notify('warn', 'Email isn’t set up yet.', r.devNote); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const verify = async (code: string) => {
    setErr(''); setBusy(true);
    try {
      const r = await api<{ isNew: boolean; user: { name: string | null } }>('/api/auth/verify', { json: { email: email.trim(), code, promo_ok: promo } });
      await refreshUser();
      notify('ok', r.isNew ? 'Welcome to Tiada.' : `Welcome back${r.user.name ? ', ' + r.user.name.split(' ')[0] : ''}.`);
      if (next) router.push(next);
    } catch (e) { setErr((e as Error).message); setDigits(['', '', '', '', '', '']); boxes.current[0]?.focus(); } finally { setBusy(false); }
  };
  const type = (i: number, v: string) => {
    const only = v.replace(/\D/g, '');
    if (only.length > 1) { const d = only.slice(0, 6).split(''); const n = [...d, '', '', '', '', '', ''].slice(0, 6); setDigits(n); if (d.length === 6) verify(d.join('')); else boxes.current[d.length]?.focus(); return; }
    const n = [...digits]; n[i] = only; setDigits(n);
    if (only && i < 5) boxes.current[i + 1]?.focus();
    if (n.every(Boolean)) verify(n.join(''));
  };

  return (
    <div className="fade" style={{ maxWidth: 460, margin: '0 auto', padding: '56px clamp(16px, 3vw, 28px) 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <H1>{step === 'email' ? 'Sign in or create an account' : 'Check your email'}</H1>
      {step === 'email' ? (
        <form onSubmit={e => { e.preventDefault(); send(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#4D5A52' }}>No password needed. We’ll email you a 6-digit code. New here? The same code creates your account.</p>
          <label style={labelStyle}>Email<input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} autoFocus style={{ ...field, borderColor: err ? '#B8402B' : '#DCD6CA' }} /></label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, lineHeight: 1.5, color: '#4D5A52' }}><input type="checkbox" checked={promo} onChange={e => setPromo(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: '#0B3A23' }} />Send me new stock and combo deals now and then</label>
          {err && <p role="alert" className="shake" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
          <button type="submit" disabled={busy} className="ub btn-solid press" style={{ ...btnSolid, opacity: busy ? 0.7 : 1 }}>{busy ? 'Sending code…' : 'Email me a code'}</button>
          <p style={{ margin: 0, fontSize: 13, color: '#66736B' }}>Just want to check an order? <Link href="/track" className="lnk" style={{ color: '#0B3A23' }}>Track it without signing in</Link>.</p>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#4D5A52' }}>We sent a 6-digit code to <strong style={{ color: '#1F2A23' }}>{email}</strong>. It expires in 10 minutes. Check spam if you can’t see it.</p>
          <div role="group" aria-label="6-digit code" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {digits.map((d, i) => <input key={i} ref={el => { boxes.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`} maxLength={6}
              onChange={e => type(i, e.target.value)} onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) boxes.current[i - 1]?.focus(); }}
              style={{ ...field, height: 58, padding: 0, textAlign: 'center', fontSize: 24, fontWeight: 600, borderColor: err ? '#B8402B' : '#DCD6CA' }} />)}
          </div>
          {err && <p role="alert" className="shake" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
          {busy && <p role="status" style={{ margin: 0, fontSize: 13.5, color: '#66736B' }}>Checking…</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 13.5 }}>
            {wait > 0 ? <span style={{ color: '#66736B' }}>Send a new code in {wait}s</span> : <button type="button" className="ub lnk" onClick={send} style={{ color: '#0B3A23', fontSize: 13.5 }}>Send a new code</button>}
            <button type="button" className="ub lnk" onClick={() => { setStep('email'); setErr(''); }} style={{ color: '#66736B', fontSize: 13.5 }}>Use a different email</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Signed() {
  const { user, setUser, refreshUser, addresses, data, restore, byId, notify, setCartOpen } = useShop();
  const router = useRouter();
  const [tab, setTab] = useState<'orders' | 'addresses' | 'details'>('orders');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [ask, setAsk] = useState<'out' | 'delete' | null>(null);
  useEffect(() => { api<{ orders: Order[] }>('/api/me/orders').then(r => { setOrders(r.orders); setOpen(r.orders[0]?.id || null); }).catch(() => setOrders([])); }, []);

  const again = (o: Order) => {
    const lines: CartLine[] = []; const gone: string[] = [];
    for (const it of o.items) {
      const p = byId[it.pid]; const s = p?.sizes.find(z => z.label === it.size);
      if (!p || !s || s.na || s.price == null || s.left === 0 || p.status === 'out' || p.status === 'na') { gone.push(it.name + (it.size !== 'Package' ? ' ' + it.size : '')); continue; }
      const qty = s.left != null ? Math.min(it.qty, s.left) : it.qty;
      lines.push({ key: lineKey(it.pid, it.size, it.swaps), pid: it.pid, size: it.size, qty, swaps: it.swaps?.length ? it.swaps : undefined });
    }
    if (!lines.length) return notify('warn', 'Nothing from this order is in stock right now.', 'Try again later, or browse what’s in today.');
    restore(lines); setCartOpen(true);
    notify(gone.length ? 'warn' : 'ok', `${lines.length} item${lines.length === 1 ? '' : 's'} added to your cart.`, gone.length ? `Not available now: ${gone.join(', ')}.` : 'Prices are today’s prices.');
  };
  const signOut = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => null); setUser(null); notify('info', 'You’re signed out.'); router.push('/'); };
  const del = async () => { try { await api('/api/me', { method: 'DELETE' }); setUser(null); notify('info', 'Your account has been deleted.'); router.push('/'); } catch (e) { notify('err', 'We couldn’t delete your account.', (e as Error).message); } };

  const TABS = [['orders', 'Orders'], ['addresses', 'Addresses'], ['details', 'My details']] as const;
  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto', padding: '40px clamp(16px, 3vw, 28px) 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <H1>Hello{user?.name ? ', ' + user.name.split(' ')[0] : ''}</H1>
        <button type="button" className="ub lnk" onClick={() => setAsk('out')} style={{ fontSize: 14, color: '#66736B' }}>Sign out</button>
      </div>
      <div role="tablist" aria-label="Account" className="noscroll" style={{ display: 'flex', gap: 24, marginTop: 22, borderBottom: '1px solid #ECE8DF', overflowX: 'auto' }}>
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className="ub" onClick={() => setTab(k)} style={{ height: 46, fontSize: 14.5, fontWeight: tab === k ? 600 : 500, color: tab === k ? '#0B3A23' : '#66736B', borderBottom: `2px solid ${tab === k ? '#0B3A23' : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap' }}>{l}</button>)}
      </div>

      {tab === 'orders' && (
        <div role="tabpanel" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!orders ? [0, 1].map(i => <div key={i} className="skel" style={{ height: 88, borderRadius: 8 }} />)
            : !orders.length ? (
              <div style={{ padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>No orders yet</p>
                <p style={{ margin: 0, fontSize: 14, color: '#66736B' }}>Orders you place with {user?.email} will show here.</p>
                <Link href="/aisle/all" className="ub btn-solid press" style={btnSolid}>Start shopping</Link>
              </div>
            ) : orders.map(o => { const on = open === o.id; return (
              <article key={o.id} style={{ border: '1px solid #ECE8DF', borderRadius: 8, overflow: 'hidden' }}>
                <button type="button" className="ub drop-row" aria-expanded={on} onClick={() => setOpen(on ? null : o.id)} style={{ width: '100%', padding: '16px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', textAlign: 'left' }}>
                  <span style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 2 }}><strong style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.03em' }}>{o.id}</strong><span style={{ fontSize: 12.5, color: '#66736B' }}>{date(o.created_at)} · {o.items.reduce((a, i) => a + i.qty, 0)} items</span></span>
                  <StatusPill s={o.status} />
                  <span style={{ fontSize: 15, fontWeight: 600, minWidth: 90, textAlign: 'right' }}>{naira(o.total)}</span>
                </button>
                {on && (
                  <div className="fade" style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <OrderSteps status={o.status} />
                    {o.status === 'issue' && o.issue && <p style={{ margin: 0, padding: '12px 14px', borderRadius: 6, background: '#FBEFEB', fontSize: 13.5, lineHeight: 1.6, color: '#5C3A30' }}><strong style={{ color: '#7A2A1B' }}>{o.issue.reason || 'We hit a problem with this order.'}</strong> {o.issue.note}{o.issue.eta ? ` New date: ${o.issue.eta}.` : ''}</p>}
                    {o.rider?.tracking && <p style={{ margin: 0, fontSize: 13.5 }}>Courier: <strong>{o.rider.partner}</strong> · tracking number <strong>{o.rider.tracking}</strong></p>}
                    {o.rider?.driver && <p style={{ margin: 0, fontSize: 13.5 }}>Rider: <strong>{o.rider.driver}</strong>{o.rider.phone ? <> · <a href={'tel:' + o.rider.phone} style={{ color: '#0B3A23' }}>{o.rider.phone}</a></> : null}</p>}
                    <div style={{ fontSize: 14 }}>
                      {o.items.map((it, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid #F0ECE3' }}><span>{it.name}{it.size !== 'Package' ? ` · ${it.size}` : ''} × {it.qty}{it.swaps?.length ? <span style={{ display: 'block', fontSize: 12, color: '#8A5F1C' }}>Swaps: {it.swaps.map(w => `${w.from} → ${w.to}`).join(', ')}</span> : null}</span><span>{naira(it.price * it.qty)}</span></div>)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F0ECE3', color: '#66736B' }}><span>Delivery · {o.speed_label}</span><span>{naira(o.delivery_fee)}</span></div>
                      {o.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F0ECE3', color: '#0B3A23' }}><span>Discount</span><span>−{naira(o.discount)}</span></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F0ECE3', color: '#66736B', fontSize: 13 }}><span>To {o.address}, {o.area_label}</span></div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      <button type="button" className="ub btn-solid press" onClick={() => again(o)} style={{ ...btnSolid, height: 46, fontSize: 14 }}>Order again</button>
                      <a href={waLink(data.business.whatsapp, `Hi Tiada, about my order ${o.id}.`)} target="_blank" rel="noopener" className="btn-out" style={{ ...btnOut, height: 46, fontSize: 14 }}>Get help with this order</a>
                    </div>
                  </div>
                )}
              </article>); })}
        </div>
      )}

      {tab === 'addresses' && <Addresses list={addresses} reload={refreshUser} />}

      {tab === 'details' && <Details onDelete={() => setAsk('delete')} />}

      {ask === 'out' && <Dialog title="Sign out?" text="Your cart stays on this device." yesLabel="Sign out" onNo={() => setAsk(null)} onYes={() => { setAsk(null); signOut(); }} />}
      {ask === 'delete' && <Dialog title="Delete your account?" text="This removes your details, saved addresses and reviews. Past orders stay on our records for tax, but are no longer linked to you. This can’t be undone." yesLabel="Delete my account" danger onNo={() => setAsk(null)} onYes={() => { setAsk(null); del(); }} />}
    </div>
  );
}

function Addresses({ list, reload }: { list: Address[]; reload: () => Promise<void> }) {
  const { data, notify } = useShop();
  const [adding, setAdding] = useState(false);
  const [a, setA] = useState({ label: 'Home', street: '', landmark: '', zone_id: '' });
  const [err, setErr] = useState('');
  const zoneName = (id: string | null) => { const z = data.zones.find(x => x.id === id); return z ? z.state || z.label : ''; };
  const save = async () => {
    setErr('');
    if (!a.zone_id) return setErr('Choose the area or state.');
    try { await api('/api/me/addresses', { json: { ...a, landmark: a.landmark || null } }); await reload(); setAdding(false); setA({ label: 'Home', street: '', landmark: '', zone_id: '' }); notify('ok', 'Address saved.'); }
    catch (e) { setErr((e as Error).message); }
  };
  const remove = async (id: string) => { try { await api('/api/me/addresses?id=' + id, { method: 'DELETE' }); await reload(); notify('info', 'Address removed.'); } catch (e) { notify('err', 'Couldn’t remove that address.', (e as Error).message); } };
  const makeDefault = async (id: string) => { try { await api('/api/me/addresses', { method: 'PATCH', json: { id } }); await reload(); notify('ok', 'Default address updated.'); } catch (e) { notify('err', 'Couldn’t update that.', (e as Error).message); } };
  return (
    <div role="tabpanel" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
      {list.map((x, i) => (
        <div key={x.id} style={{ border: `1px solid ${i === 0 ? '#0B3A23' : '#ECE8DF'}`, borderRadius: 8, padding: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ fontWeight: 600 }}>{x.label}</strong>{i === 0 && <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0B3A23' }}>Default</span>}</span>
          <span style={{ lineHeight: 1.55 }}>{x.street}</span>
          {x.landmark && <span style={{ fontSize: 13, color: '#66736B' }}>Near {x.landmark}</span>}
          <span style={{ fontSize: 13, color: '#66736B' }}>{zoneName(x.zone_id)}</span>
          <span style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            {i > 0 && <button type="button" className="ub lnk" onClick={() => makeDefault(x.id)} style={{ fontSize: 13, color: '#0B3A23' }}>Make default</button>}
            <button type="button" className="ub lnk" onClick={() => remove(x.id)} style={{ fontSize: 13, color: '#66736B' }}>Remove</button>
          </span>
        </div>
      ))}
      {!adding ? (list.length < 5 && <button type="button" className="ub" onClick={() => setAdding(true)} style={{ minHeight: 150, borderRadius: 8, border: '1.5px dashed #CFC8B9', fontSize: 14, fontWeight: 600, color: '#0B3A23' }}>+ Add an address</button>) : (
        <form onSubmit={e => { e.preventDefault(); save(); }} className="fade" style={{ gridColumn: '1 / -1', border: '1px solid #ECE8DF', borderRadius: 8, padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label style={labelStyle}>Name it<input value={a.label} onChange={e => setA({ ...a, label: e.target.value })} maxLength={20} placeholder="Home, Office…" style={field} /></label>
          <label style={labelStyle}>Area or state<select value={a.zone_id} onChange={e => setA({ ...a, zone_id: e.target.value })} style={field}><option value="">Choose…</option><optgroup label="Lagos">{data.zones.filter(z => !z.state).map(z => <option key={z.id} value={z.id}>{z.label}</option>)}</optgroup><optgroup label="Outside Lagos">{data.zones.filter(z => z.state).map(z => <option key={z.id} value={z.id}>{z.state}</option>)}</optgroup></select></label>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Street address<input value={a.street} onChange={e => setA({ ...a, street: e.target.value })} placeholder="House number, street, estate" style={field} /></label>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Nearest landmark (optional)<input value={a.landmark} onChange={e => setA({ ...a, landmark: e.target.value })} style={field} /></label>
          {err && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 14, alignItems: 'center' }}><button type="submit" className="ub btn-solid press" style={{ ...btnSolid, height: 46 }}>Save address</button><button type="button" className="ub lnk" onClick={() => setAdding(false)} style={{ fontSize: 14 }}>Cancel</button></div>
        </form>
      )}
    </div>
  );
}

function Details({ onDelete }: { onDelete: () => void }) {
  const { user, setUser, notify } = useShop();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(''); setBusy(true);
    try { const r = await api<{ user: NonNullable<typeof user> }>('/api/me', { method: 'PATCH', json: { name: name.trim() || undefined, phone: phone.replace(/[\s-]/g, '') || undefined } }); setUser(r.user); notify('ok', 'Your details are saved.'); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const promo = async (v: boolean) => {
    try { const r = await api<{ user: NonNullable<typeof user> }>('/api/me', { method: 'PATCH', json: { promo_ok: v } }); setUser(r.user); notify('ok', v ? 'You’ll get our deals emails.' : 'No more deals emails.', v ? '' : 'You’ll still get emails about your orders.'); }
    catch (e) { notify('err', 'Couldn’t change that.', (e as Error).message); }
  };
  return (
    <div role="tabpanel" style={{ marginTop: 24, maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label style={labelStyle}>Email<input value={user?.email || ''} readOnly style={{ ...field, background: '#F7F5F0', color: '#66736B' }} /></label>
      <label style={labelStyle}>Full name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={field} /></label>
      <label style={labelStyle}>Phone<input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" style={field} /></label>
      {err && <p role="alert" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
      <button type="button" disabled={busy} className="ub btn-solid press" onClick={save} style={{ ...btnSolid, alignSelf: 'flex-start', height: 46 }}>Save changes</button>
      <div style={{ height: 1, background: '#ECE8DF', margin: '8px 0' }} />
      <button type="button" role="switch" aria-checked={!!user?.promo_ok} className="ub" onClick={() => promo(!user?.promo_ok)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, textAlign: 'left' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>Deals emails</span><span style={{ fontSize: 13, color: '#66736B' }}>New stock and combo deals, now and then.</span></span>
        <span style={{ width: 42, height: 24, borderRadius: 999, background: user?.promo_ok ? '#0B3A23' : '#C9CFC9', position: 'relative', flex: 'none' }}><span style={{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', transition: 'transform .2s', transform: `translateX(${user?.promo_ok ? 18 : 0}px)` }} /></span>
      </button>
      <div style={{ height: 1, background: '#ECE8DF', margin: '8px 0' }} />
      <button type="button" className="ub lnk" onClick={onDelete} style={{ alignSelf: 'flex-start', fontSize: 13.5, color: '#9E3522' }}>Delete my account</button>
    </div>
  );
}
