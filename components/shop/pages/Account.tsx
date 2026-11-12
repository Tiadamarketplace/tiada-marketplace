'use client';
import Link from '@/components/shop/Link';

import { useEffect, useMemo, useRef, useState } from 'react';
import AddressSearch, { PlaceRef } from '../AddressSearch';
import { useShop, Address } from '../ShopProvider';
import { Dialog } from '../Overlays';
import OrderSteps, { StatusPill } from '../OrderSteps';
import { ProductImage } from '../ProductCard';
import { naira, api, lineKey, CartLine, waLink } from '@/lib/shop-client';
import { H1, btnSolid, btnOut, field, labelStyle, Spin, BusyButton } from '../ui';

type OItem = { pid: string; name: string; size: string; qty: number; price: number; swaps?: { from: string; to: string }[] };
type Order = { drop_code?: string | null; id: string; status: string; total: number; delivery_fee: number; discount: number; created_at: string; address: string; area_label: string | null; speed_label: string | null; items: OItem[]; rider: { partner?: string; tracking?: string; driver?: string; phone?: string } | null; issue: { reason?: string; note?: string; eta?: string } | null; refunds?: { amount: number }[] | null };
type Tab = 'overview' | 'orders' | 'addresses' | 'profile' | 'privacy';
const date = (s: string) => new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Account({ next }: { next: string }) {
  const { user, userReady } = useShop();
  // already signed in and sent here to sign in? go straight on
  useEffect(() => { if (userReady && user && next) window.location.replace(next); }, [userReady, user, next]);
  if (!userReady || (user && next)) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px clamp(16px, 3vw, 28px)' }}>
      <div className="skel" style={{ height: 170, borderRadius: 16 }} />
      <div style={{ display: 'flex', gap: 20, marginTop: 24 }}><div className="skel" style={{ height: 260, width: 240, borderRadius: 12 }} /><div className="skel" style={{ height: 260, flex: 1, borderRadius: 12 }} /></div>
    </div>
  );
  return user ? <Profile /> : <SignIn next={next} />;
}

function SignIn({ next }: { next: string }) {
  const { refreshUser, notify, setUser } = useShop();
  const [step, setStep] = useState<'email' | 'code' | 'details'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [promo, setPromo] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [d, setD] = useState({ name: '', phone: '' });
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const finish = async () => { await refreshUser(); if (next) window.location.assign(next); };

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
      const r = await api<{ isNew: boolean; user: { name: string | null; phone: string | null } }>('/api/auth/verify', { json: { email: email.trim(), code, promo_ok: promo } });
      if (r.isNew || !r.user.name || !r.user.phone) { setD({ name: r.user.name || '', phone: r.user.phone || '' }); setStep('details'); notify('ok', r.isNew ? 'Your account is ready.' : 'You’re signed in.', 'One last thing.'); }
      else { notify('ok', `Welcome back, ${r.user.name.split(' ')[0]}.`); await finish(); }
    } catch (e) { setErr((e as Error).message); setDigits(['', '', '', '', '', '']); boxes.current[0]?.focus(); } finally { setBusy(false); }
  };
  const saveDetails = async () => {
    setErr(''); setBusy(true);
    try { const r = await api<{ user: Parameters<typeof setUser>[0] }>('/api/me', { method: 'PATCH', json: { name: d.name.trim() || undefined, phone: d.phone.trim() || undefined } }); setUser(r.user); notify('ok', 'Welcome to Tiada.'); await finish(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const type = (i: number, v: string) => {
    const only = v.replace(/\D/g, '');
    if (only.length > 1) { const dd = only.slice(0, 6).split(''); const n = [...dd, '', '', '', '', '', ''].slice(0, 6); setDigits(n); if (dd.length === 6) verify(dd.join('')); else boxes.current[dd.length]?.focus(); return; }
    const n = [...digits]; n[i] = only; setDigits(n);
    if (only && i < 5) boxes.current[i + 1]?.focus();
    if (n.every(Boolean)) verify(n.join(''));
  };

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto', padding: '48px clamp(16px, 3vw, 28px) 0', display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center' }}>
      <div style={{ flex: '1 1 380px', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4E5A53' }}>{step === 'details' ? 'Almost done' : 'My account'}</span>
        <H1>{step === 'email' ? 'Sign in or create an account' : step === 'code' ? 'Check your email' : 'Tell us who you are'}</H1>
        {step === 'email' && (
          <form onSubmit={e => { e.preventDefault(); send(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#3C4741' }}>No password to remember. We’ll email you a 6-digit code. New here? The same code creates your account, and you stay signed in on this device.</p>
            <label style={labelStyle}>Email<input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} autoFocus style={{ ...field, borderColor: err ? '#B8402B' : '#DCD6CA' }} /></label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, lineHeight: 1.5, color: '#3C4741' }}><input type="checkbox" checked={promo} onChange={e => setPromo(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: '#0B3A23' }} />Send me new stock and combo deals now and then</label>
            {err && <p role="alert" className="shake" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
            <button type="submit" disabled={busy} className="ub btn-solid press" style={{ ...btnSolid, opacity: busy ? 0.7 : 1 }}>{busy ? <><Spin />Sending code…</> : 'Email me a code'}</button>
            <p style={{ margin: 0, fontSize: 13, color: '#4E5A53' }}>Just want to check an order? <Link href="/track" className="lnk" style={{ color: '#0B3A23' }}>Track it without signing in</Link>.</p>
          </form>
        )}
        {step === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#3C4741' }}>We sent a 6-digit code to <strong style={{ color: '#1F2A23' }}>{email}</strong>. It works for 10 minutes. Check spam if you can’t see it.</p>
            <div role="group" aria-label="6-digit code" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {digits.map((dg, i) => <input key={i} ref={el => { boxes.current[i] = el; }} value={dg} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`} maxLength={6}
                onChange={e => type(i, e.target.value)} onKeyDown={e => { if (e.key === 'Backspace' && !dg && i > 0) boxes.current[i - 1]?.focus(); }}
                style={{ ...field, height: 58, padding: 0, textAlign: 'center', fontSize: 24, fontWeight: 600, borderColor: err ? '#B8402B' : '#DCD6CA' }} />)}
            </div>
            {err && <p role="alert" className="shake" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
            {busy && <p role="status" style={{ margin: 0, fontSize: 14, color: '#3C4741', display: 'flex', alignItems: 'center', gap: 10 }}><Spin dark />Checking your code…</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 13.5 }}>
              {wait > 0 ? <span style={{ color: '#4E5A53' }}>Send a new code in {wait}s</span> : <button type="button" className="ub lnk" onClick={send} style={{ color: '#0B3A23', fontSize: 13.5 }}>Send a new code</button>}
              <button type="button" className="ub lnk" onClick={() => { setStep('email'); setErr(''); }} style={{ color: '#4E5A53', fontSize: 13.5 }}>Use a different email</button>
            </div>
            <details style={{ borderTop: '1px solid #ECE8DF', paddingTop: 14, fontSize: 14, color: '#3C4741', lineHeight: 1.7 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#1F2A23' }}>Didn’t get the code?</summary>
              <p style={{ margin: '8px 0 0' }}>It can take a minute. Check your spam or promotions folder for an email from Tiada. Make sure <strong>{email}</strong> is spelled right, or send a new code.</p>
              <p style={{ margin: '8px 0 0' }}>Can’t get into that email any more? <a href="https://wa.me/2348075110000?text=Hi%20Tiada%2C%20I%20can%E2%80%99t%20get%20into%20my%20account." target="_blank" rel="noopener" style={{ color: '#1F2A23', textDecoration: 'underline', textUnderlineOffset: 4 }}>Message us on WhatsApp</a> and we’ll move your account to a new email.</p>
            </details>
          </div>
        )}
        {step === 'details' && (
          <form onSubmit={e => { e.preventDefault(); saveDetails(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#3C4741' }}>We’ll use these at checkout so you don’t type them again, and the rider uses your number to find you.</p>
            <label style={labelStyle}>Full name<input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} autoComplete="name" autoFocus style={field} /></label>
            <label style={labelStyle}>Phone number<input value={d.phone} onChange={e => setD({ ...d, phone: e.target.value })} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" style={field} /></label>
            {err && <p role="alert" className="shake" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
            <button type="submit" disabled={busy} className="ub btn-solid press" style={btnSolid}>{busy ? <><Spin />Saving…</> : 'Save and continue'}</button>
            <button type="button" className="ub lnk" onClick={finish} style={{ alignSelf: 'center', fontSize: 13.5, color: '#4E5A53' }}>Skip for now</button>
          </form>
        )}
      </div>
      <aside className="hide-xs" style={{ flex: '1 1 300px', maxWidth: 380, alignSelf: 'stretch', borderLeft: '1px solid #ECE8DF', paddingLeft: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>New to Tiada?</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: '#3C4741' }}>Use the same form. Your account is made the moment you enter the code, and you stay signed in on this device.</p>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: '#3C4741' }}>With an account, checkout fills in your details, every order is kept in one place, and you can buy a past order again in one tap.</p>
        <h2 style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Forgot your password?</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: '#3C4741' }}>There isn’t one to forget. Every time you sign in, we email you a fresh code, so nobody can guess or steal a password.</p>
      </aside>
    </div>
  );
}

const NAV: [Tab, string][] = [['overview', 'Overview'], ['orders', 'Orders'], ['addresses', 'Addresses'], ['profile', 'Personal details'], ['privacy', 'Emails & privacy']];
const STATUS_WORD: Record<string, string> = { new: 'Being packed', packed: 'Packed', route: 'On the way', done: 'Delivered', issue: 'Delayed', refunded: 'Refunded', cancelled: 'Cancelled' };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4E5A53' };
const h2: React.CSSProperties = { margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1F2A23' };
const textLink: React.CSSProperties = { fontSize: 13.5, fontWeight: 500, color: '#1F2A23', textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: '#B9B3A5' };

function Profile() {
  const { user, setUser, refreshUser, addresses, data, restore, byId, notify, setCartOpen } = useShop();
  const [tab, setTabState] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [ask, setAsk] = useState<'out' | 'delete' | null>(null);
  useEffect(() => { const h = location.hash.slice(1) as Tab; if (NAV.some(n => n[0] === h)) setTabState(h); }, []);
  useEffect(() => { api<{ orders: Order[] }>('/api/me/orders').then(r => setOrders(r.orders)).catch(() => setOrders([])); }, []);
  const setTab = (t: Tab) => { setTabState(t); history.replaceState(null, '', '#' + t); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const live = (orders || []).filter(o => o.status !== 'cancelled');
  const buyAgain = useMemo(() => {
    const t: Record<string, number> = {};
    for (const o of live) for (const it of o.items) if (byId[it.pid]) t[it.pid] = (t[it.pid] || 0) + it.qty;
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([pid]) => byId[pid]);
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null;

  const current = (orders || []).find(o => ['new', 'packed', 'route', 'issue'].includes(o.status));
  const since = user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  const def = addresses[0];

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
  const signOut = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => null); setUser(null); notify('info', 'You’re signed out.'); window.location.assign('/'); };
  const del = async () => { try { await api('/api/me', { method: 'DELETE' }); setUser(null); notify('info', 'Your account has been deleted.'); window.location.assign('/'); } catch (e) { notify('err', 'We couldn’t delete your account.', (e as Error).message); } };
  const view = (id: string) => { setOpen(id); setTab('orders'); };

  const Row = ({ o }: { o: Order }) => (
    <button type="button" className="ub drop-row acct-row" onClick={() => view(o.id)} style={{ width: '100%', display: 'grid', gridTemplateColumns: '110px 100px minmax(0, 1fr) 110px 90px', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid #ECE8DF', textAlign: 'left', fontSize: 14 }}>
      <span style={{ color: '#4E5A53' }}>{date(o.created_at)}</span>
      <span style={{ fontWeight: 600 }}>{o.id}</span>
      <span style={{ color: '#3C4741', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</span>
      <span style={{ color: o.status === 'issue' ? '#9E3522' : '#1F2A23' }}>{STATUS_WORD[o.status] || o.status}</span>
      <span style={{ textAlign: 'right', fontWeight: 600 }}>{naira(o.total)}</span>
    </button>
  );
  const Detail = ({ o }: { o: Order }) => (
    <article style={{ borderTop: '1px solid #1F2A23', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 18px' }}>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Order {o.id}</h3>
        <span style={{ fontSize: 13.5, color: '#4E5A53' }}>Placed {date(o.created_at)} · {STATUS_WORD[o.status]}</span>
        <button type="button" className="ub" onClick={() => setOpen(null)} style={{ marginLeft: 'auto', ...textLink }}>Back to all orders</button>
      </div>
      <OrderSteps status={o.status} />
      {o.drop_code && ['new', 'packed', 'route'].includes(o.status) && <p style={{ margin: 0, padding: '12px 16px', borderRadius: 6, background: '#FBF2DE', color: '#5C430F', fontSize: 14, lineHeight: 1.6 }}><strong style={{ color: '#3D2C08', letterSpacing: '0.06em' }}>Delivery code: {o.drop_code}.</strong> Give it to our rider at the door, once you have your order.</p>}
      {o.status === 'issue' && o.issue && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#7A2A1B' }}>{o.issue.reason || 'We hit a problem with this order.'} {o.issue.note}{o.issue.eta ? ` New date: ${o.issue.eta}.` : ''}</p>}
      {(o.rider?.tracking || o.rider?.driver) && <p style={{ margin: 0, fontSize: 14, color: '#3C4741' }}>{o.rider.driver ? <>Your rider is {o.rider.driver}{o.rider.phone ? <> · <a href={'tel:' + o.rider.phone} style={{ color: '#1F2A23' }}>{o.rider.phone}</a></> : null}</> : <>Sent with {o.rider.partner}, tracking number {o.rider.tracking}</>}</p>}
      <div>
        {o.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid #ECE8DF' }}>
            <span style={{ position: 'relative', width: 64, height: 64, flex: 'none', background: '#F7F4EC', overflow: 'hidden' }}>{byId[it.pid] ? <ProductImage p={byId[it.pid]} size={10} /> : null}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 14 }}><span style={{ fontWeight: 500 }}>{it.name}</span><span style={{ color: '#4E5A53', fontSize: 13 }}>{it.size !== 'Package' ? `${it.size} · ` : ''}Qty {it.qty}{it.swaps?.length ? ` · Swapped ${it.swaps.map(w => `${w.from} for ${w.to}`).join(', ')}` : ''}</span></span>
            <span style={{ fontSize: 14 }}>{naira(it.price * it.qty)}</span>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, padding: '14px 0', fontSize: 14 }}>
          <span style={{ color: '#4E5A53' }}>Delivery · {o.speed_label}</span><span style={{ textAlign: 'right' }}>{naira(o.delivery_fee)}</span>
          {o.discount > 0 && <><span style={{ color: '#4E5A53' }}>Discount</span><span style={{ textAlign: 'right' }}>−{naira(o.discount)}</span></>}
          <span style={{ fontWeight: 600 }}>Total</span><span style={{ textAlign: 'right', fontWeight: 600 }}>{naira(o.total)}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, fontSize: 14, lineHeight: 1.6 }}>
        <div><div style={label}>Delivered to</div><div style={{ marginTop: 6 }}>{o.address}<br />{o.area_label}</div></div>
        <div><div style={label}>Need help?</div><div style={{ marginTop: 6 }}><a href={waLink(data.business.whatsapp, `Hi Tiada, about my order ${o.id}.`)} target="_blank" rel="noopener" style={textLink}>Message us about this order</a></div></div>
      </div>
      <div><button type="button" className="ub btn-solid press" onClick={() => again(o)} style={{ ...btnSolid, height: 48, fontSize: 14 }}>Order these again</button></div>
    </article>
  );

  return (
    <div className="fade" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px clamp(16px, 3vw, 28px) 0' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingBottom: 24, borderBottom: '1px solid #ECE8DF' }}>
        <div>
          <div style={label}>My account</div>
          <h1 style={{ margin: '10px 0 0', fontWeight: 500, fontSize: 'clamp(28px, 4vw, 38px)', letterSpacing: '-0.015em' }}>{user.name || user.email}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#4E5A53' }}>{user.name ? user.email : ''}{user.name && since ? ' · ' : ''}{since ? `Customer since ${since}` : ''}</p>
        </div>
        <button type="button" className="ub" onClick={() => setAsk('out')} style={textLink}>Sign out</button>
      </header>

      <div className="acct-wrap" style={{ display: 'flex', gap: 56, marginTop: 32, alignItems: 'flex-start' }}>
        <nav aria-label="Account sections" className="acct-nav noscroll" style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 150 }}>
          {NAV.map(([k, l]) => { const on = tab === k; return (
            <button key={k} type="button" className="ub acct-link" aria-current={on ? 'page' : undefined} onClick={() => { setOpen(null); setTab(k); }} style={{ padding: '11px 0 11px 16px', borderLeft: `2px solid ${on ? '#0B3A23' : '#ECE8DF'}`, fontSize: 14.5, fontWeight: on ? 600 : 400, color: on ? '#0B3A23' : '#3C4741', whiteSpace: 'nowrap', textAlign: 'left' }}>{l}</button>); })}
        </nav>

        <div key={tab + (open || '')} className="fade" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 44 }}>
          {tab === 'overview' && <>
            {current && (
              <section aria-labelledby="cur-h">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}><h2 id="cur-h" style={h2}>Current order</h2><button type="button" className="ub" onClick={() => view(current.id)} style={textLink}>View order</button></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 16px', marginBottom: 16 }}><span style={{ fontSize: 20, fontWeight: 500 }}>{current.id}</span><span style={{ fontSize: 14, color: current.status === 'issue' ? '#9E3522' : '#3C4741' }}>{STATUS_WORD[current.status]}{current.status === 'route' && current.rider?.driver ? ` with ${current.rider.driver}` : ''}</span></div>
                <OrderSteps status={current.status} />
              </section>
            )}
            <section aria-labelledby="rec-h">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12, borderBottom: '1px solid #1F2A23' }}><h2 id="rec-h" style={h2}>Recent orders</h2>{orders && orders.length > 3 && <button type="button" className="ub" onClick={() => setTab('orders')} style={textLink}>View all</button>}</div>
              {!orders ? <div className="skel" style={{ height: 120, marginTop: 12 }} /> : !orders.length
                ? <p style={{ margin: '18px 0 0', fontSize: 14.5, color: '#3C4741' }}>You haven’t ordered yet. <Link href="/aisle/all" style={textLink}>Start shopping</Link></p>
                : orders.slice(0, 3).map(o => <Row key={o.id} o={o} />)}
            </section>
            {buyAgain.length > 0 && (
              <section aria-labelledby="ba-h">
                <h2 id="ba-h" style={{ ...h2, marginBottom: 16 }}>Buy again</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
                  {buyAgain.map(p => <Link key={p.id} href={'/p/' + p.id} className="pcard" style={{ display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: '#1F2A23' }}><span className="pimg" style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', background: '#F7F4EC' }}><ProductImage p={p} size={14} /></span><span className="pname" style={{ fontSize: 14 }}>{p.name}</span></Link>)}
                </div>
              </section>
            )}
            <section aria-labelledby="det-h">
              <h2 id="det-h" style={{ ...h2, paddingBottom: 12, borderBottom: '1px solid #1F2A23' }}>Your details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, paddingTop: 20, fontSize: 14.5, lineHeight: 1.65 }}>
                <div><div style={label}>Contact</div><div style={{ marginTop: 8 }}>{user.name || <span style={{ color: '#4E5A53' }}>No name yet</span>}<br />{user.phone ? user.phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3') : <span style={{ color: '#4E5A53' }}>No phone yet</span>}<br />{user.email}</div><button type="button" className="ub" onClick={() => setTab('profile')} style={{ ...textLink, marginTop: 10 }}>Edit</button></div>
                <div><div style={label}>Default address</div><div style={{ marginTop: 8 }}>{def ? <>{def.street}<br />{def.spot?.label || ''}</> : <span style={{ color: '#4E5A53' }}>No address saved yet</span>}</div><button type="button" className="ub" onClick={() => setTab('addresses')} style={{ ...textLink, marginTop: 10 }}>{def ? 'Manage' : 'Add an address'}</button></div>
                <div><div style={label}>Emails</div><div style={{ marginTop: 8 }}>Order updates: on<br />Deals and new stock: {user.promo_ok ? 'on' : 'off'}</div><button type="button" className="ub" onClick={() => setTab('privacy')} style={{ ...textLink, marginTop: 10 }}>Change</button></div>
              </div>
            </section>
          </>}

          {tab === 'orders' && (open && orders?.find(o => o.id === open) ? <Detail o={orders.find(o => o.id === open)!} /> : (
            <section>
              <div className="acct-head adesk-only" style={{ display: 'grid', gridTemplateColumns: '110px 100px minmax(0, 1fr) 110px 90px', gap: 16, paddingBottom: 12, borderBottom: '1px solid #1F2A23', ...label, color: '#1F2A23' }}><span>Date</span><span>Order</span><span>Items</span><span>Status</span><span style={{ textAlign: 'right' }}>Total</span></div>
              {!orders ? <div className="skel" style={{ height: 160, marginTop: 12 }} /> : !orders.length
                ? <p style={{ margin: '18px 0 0', fontSize: 14.5, color: '#3C4741' }}>You haven’t ordered yet. <Link href="/aisle/all" style={textLink}>Start shopping</Link></p>
                : orders.map(o => <Row key={o.id} o={o} />)}
            </section>
          ))}
          {tab === 'addresses' && <section><h2 style={{ ...h2, paddingBottom: 12, borderBottom: '1px solid #1F2A23', marginBottom: 20 }}>Addresses</h2><Addresses list={addresses} reload={refreshUser} /></section>}
          {tab === 'profile' && <section><h2 style={{ ...h2, paddingBottom: 12, borderBottom: '1px solid #1F2A23', marginBottom: 20 }}>Personal details</h2><Details /></section>}
          {tab === 'privacy' && <section><h2 style={{ ...h2, paddingBottom: 12, borderBottom: '1px solid #1F2A23' }}>Emails & privacy</h2><Privacy onDelete={() => setAsk('delete')} onSignOut={() => setAsk('out')} /></section>}
        </div>
      </div>
      {ask === 'out' && <Dialog title="Sign out?" text="You’ll need a new email code to sign in again. Your cart stays on this device." yesLabel="Sign out" onNo={() => setAsk(null)} onYes={() => signOut()} />}
      {ask === 'delete' && <Dialog title="Delete your account?" text="This removes your details, saved addresses and reviews. Past orders stay on our records for tax, but are no longer linked to you. This can’t be undone." yesLabel="Delete my account" danger onNo={() => setAsk(null)} onYes={() => del()} />}
    </div>
  );
}

function Addresses({ list, reload }: { list: Address[]; reload: () => Promise<void> }) {
  const { notify } = useShop();
  const [adding, setAdding] = useState(false);
  const [a, setA] = useState<{ label: string; street: string; landmark: string; place: PlaceRef | null; bad: string }>({ label: 'Home', street: '', landmark: '', place: null, bad: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setErr('');
    if (!a.place) return setErr(a.bad || 'Type the address and pick it from the suggestions.');
    setSaving(true);
    try { await api('/api/me/addresses', { json: { label: a.label, street: a.street, landmark: a.landmark || null, place: a.place } }); await reload(); setAdding(false); setA({ label: 'Home', street: '', landmark: '', place: null, bad: '' }); notify('ok', 'Address saved.'); }
    catch (e) { setErr((e as Error).message); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { try { await api('/api/me/addresses?id=' + id, { method: 'DELETE' }); await reload(); notify('info', 'Address removed.'); } catch (e) { notify('err', 'Couldn’t remove that address.', (e as Error).message); } };
  const makeDefault = async (id: string) => { try { await api('/api/me/addresses', { method: 'PATCH', json: { id } }); await reload(); notify('ok', 'Default address updated.'); } catch (e) { notify('err', 'Couldn’t update that.', (e as Error).message); } };
  return (
    <div role="tabpanel" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
      {list.map((x, i) => (
        <div key={x.id} style={{ border: `1px solid ${i === 0 ? '#1F2A23' : '#E4DFD3'}`, borderRadius: 2, padding: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ fontWeight: 600 }}>{x.label}</strong>{i === 0 && <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0B3A23' }}>Default</span>}</span>
          <span style={{ lineHeight: 1.55 }}>{x.street}</span>
          {x.landmark && <span style={{ fontSize: 13, color: '#4E5A53' }}>Near {x.landmark}</span>}
          <span style={{ fontSize: 13, color: x.spot ? '#4E5A53' : '#9E3522' }}>{x.spot ? x.spot.label : 'Add this address again so we can work out delivery.'}</span>
          <span style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            {i > 0 && <BusyButton dark className="ub lnk" onClick={() => makeDefault(x.id)} busyText="Saving…" style={{ fontSize: 13, color: '#0B3A23', display: 'flex', alignItems: 'center' }}>Make default</BusyButton>}
            <BusyButton dark className="ub lnk" onClick={() => remove(x.id)} busyText="Removing…" style={{ fontSize: 13, color: '#4E5A53', display: 'flex', alignItems: 'center' }}>Remove</BusyButton>
          </span>
        </div>
      ))}
      {!adding ? (list.length < 5 && <button type="button" className="ub" onClick={() => setAdding(true)} style={{ minHeight: 150, borderRadius: 2, border: '1.5px dashed #CFC8B9', fontSize: 14, fontWeight: 600, color: '#0B3A23' }}>+ Add an address</button>) : (
        <form onSubmit={e => { e.preventDefault(); save(); }} className="fade" style={{ gridColumn: '1 / -1', border: '1px solid #ECE8DF', borderRadius: 2, padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label style={labelStyle}>Name it<input value={a.label} onChange={e => setA({ ...a, label: e.target.value })} maxLength={20} placeholder="Home, Office…" style={field} /></label>
          <div style={{ ...labelStyle, gridColumn: '1 / -1' }}>Address<AddressSearch onPick={(p, text) => setA(x => ({ ...x, street: text, place: p?.ok ? p.place : null, bad: p && !p.ok ? p.reason : '' }))} /></div>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>House number, flat or landmark (optional)<input value={a.landmark} onChange={e => setA({ ...a, landmark: e.target.value })} maxLength={120} placeholder="e.g. No. 14, Flat 3, opposite the filling station" style={field} /></label>
          {err && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 14, alignItems: 'center' }}><button type="submit" disabled={saving} className="ub btn-solid press" style={{ ...btnSolid, height: 46, opacity: saving ? 0.7 : 1 }}>{saving ? <><Spin />Saving…</> : 'Save address'}</button><button type="button" className="ub lnk" onClick={() => setAdding(false)} style={{ fontSize: 14 }}>Cancel</button></div>
        </form>
      )}
    </div>
  );
}

function Details() {
  const { user, setUser, notify } = useShop();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = name !== (user?.name || '') || phone !== (user?.phone || '');
  const save = async () => {
    setErr(''); setBusy(true);
    try { const r = await api<{ user: NonNullable<typeof user> }>('/api/me', { method: 'PATCH', json: { name: name.trim() || undefined, phone: phone.trim() || undefined } }); setUser(r.user); notify('ok', 'Your details are saved.', 'Checkout will fill them in for you.'); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={e => { e.preventDefault(); save(); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      <label style={labelStyle}>Full name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={field} /></label>
      <label style={labelStyle}>Phone number<input value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" style={field} /></label>
      <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Email<input value={user?.email || ''} readOnly style={{ ...field, background: '#F7F5F0', color: '#4E5A53' }} /><span style={{ fontWeight: 400, fontSize: 12.5, color: '#4E5A53' }}>This is how you sign in. To change it, message us on WhatsApp.</span></label>
      {err && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
      <div style={{ gridColumn: '1 / -1' }}><button type="submit" disabled={busy || !changed} className="ub btn-solid press" style={{ ...btnSolid, height: 46, opacity: busy || !changed ? 0.5 : 1 }}>{busy ? <><Spin />Saving…</> : 'Save changes'}</button></div>
    </form>
  );
}

function Privacy({ onDelete, onSignOut }: { onDelete: () => void; onSignOut: () => void }) {
  const { user, setUser, notify } = useShop();
  const [pBusy, setPBusy] = useState(false);
  const promo = async (v: boolean) => {
    if (pBusy) return; setPBusy(true);
    try { const r = await api<{ user: NonNullable<typeof user> }>('/api/me', { method: 'PATCH', json: { promo_ok: v } }); setUser(r.user); notify('ok', v ? 'You’ll get our deals emails.' : 'No more deals emails.', v ? '' : 'You’ll still get emails about your orders.'); }
    catch (e) { notify('err', 'Couldn’t change that.', (e as Error).message); } finally { setPBusy(false); }
  };
  const row = (t: string, s: string, right: React.ReactNode) => <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0', borderBottom: '1px solid #ECE8DF' }}><span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>{t}</span><span style={{ fontSize: 13, color: '#4E5A53', lineHeight: 1.5 }}>{s}</span></span>{right}</div>;
  return (
    <div>
      {row('Deals emails', 'New stock and combo deals, a few times a month at most.', <>{pBusy && <Spin dark size={16} />}<button type="button" disabled={pBusy} aria-busy={pBusy} role="switch" aria-checked={!!user?.promo_ok} aria-label="Deals emails" className="ub" onClick={() => promo(!user?.promo_ok)} style={{ width: 44, height: 26, borderRadius: 999, background: user?.promo_ok ? '#0B3A23' : '#C9CFC9', position: 'relative', flex: 'none' }}><span style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF', transition: 'transform .2s', transform: `translateX(${user?.promo_ok ? 18 : 0}px)` }} /></button></>)}
      {row('Order emails', 'Receipts and delivery updates. These always come, so you know where your order is.', <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0B3A23' }}>Always on</span>)}
      {row('Signed in on this device', 'You stay signed in while you keep shopping. Sign out if this is a shared phone or computer.', <button type="button" className="ub btn-out" onClick={onSignOut} style={{ ...btnOut, height: 40, fontSize: 13.5, padding: '0 16px' }}>Sign out</button>)}
      {row('Your data', 'See our privacy policy for what we keep and why.', <Link href="/privacy" className="lnk" style={{ fontSize: 13.5, color: '#0B3A23' }}>Privacy policy</Link>)}
      {row('Delete account', 'Removes your details, addresses and reviews for good.', <button type="button" className="ub lnk" onClick={onDelete} style={{ fontSize: 13.5, color: '#9E3522' }}>Delete</button>)}
    </div>
  );
}
