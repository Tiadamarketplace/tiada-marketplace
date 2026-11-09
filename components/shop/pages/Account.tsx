'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShop, Address } from '../ShopProvider';
import { Dialog } from '../Overlays';
import OrderSteps, { StatusPill } from '../OrderSteps';
import { ProductImage } from '../ProductCard';
import { initials } from '../Header';
import { naira, api, lineKey, CartLine, waLink } from '@/lib/shop-client';
import { H1, btnSolid, btnOut, field, labelStyle } from '../ui';

type OItem = { pid: string; name: string; size: string; qty: number; price: number; swaps?: { from: string; to: string }[] };
type Order = { id: string; status: string; total: number; delivery_fee: number; discount: number; created_at: string; address: string; area_label: string | null; speed_label: string | null; items: OItem[]; rider: { partner?: string; tracking?: string; driver?: string; phone?: string } | null; issue: { reason?: string; note?: string; eta?: string } | null; refunds?: { amount: number }[] | null };
type Tab = 'overview' | 'orders' | 'addresses' | 'profile' | 'privacy';
const date = (s: string) => new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #ECE8DF', borderRadius: 12 };
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A5F1C' };

export default function Account({ next }: { next: string }) {
  const { user, userReady } = useShop();
  const router = useRouter();
  // already signed in and sent here to sign in? go straight on
  useEffect(() => { if (userReady && user && next) router.replace(next); }, [userReady, user, next, router]);
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
  const router = useRouter();
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
  const finish = async () => { await refreshUser(); if (next) router.push(next); };

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
        <span style={eyebrow}>{step === 'details' ? 'Almost done' : 'My account'}</span>
        <H1>{step === 'email' ? 'Sign in or create an account' : step === 'code' ? 'Check your email' : 'Tell us who you are'}</H1>
        {step === 'email' && (
          <form onSubmit={e => { e.preventDefault(); send(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#4D5A52' }}>No password to remember. We’ll email you a 6-digit code. New here? The same code creates your account, and you stay signed in on this device.</p>
            <label style={labelStyle}>Email<input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} autoFocus style={{ ...field, borderColor: err ? '#B8402B' : '#DCD6CA' }} /></label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, lineHeight: 1.5, color: '#4D5A52' }}><input type="checkbox" checked={promo} onChange={e => setPromo(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: '#0B3A23' }} />Send me new stock and combo deals now and then</label>
            {err && <p role="alert" className="shake" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
            <button type="submit" disabled={busy} className="ub btn-solid press" style={{ ...btnSolid, opacity: busy ? 0.7 : 1 }}>{busy ? 'Sending code…' : 'Email me a code'}</button>
            <p style={{ margin: 0, fontSize: 13, color: '#66736B' }}>Just want to check an order? <Link href="/track" className="lnk" style={{ color: '#0B3A23' }}>Track it without signing in</Link>.</p>
          </form>
        )}
        {step === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#4D5A52' }}>We sent a 6-digit code to <strong style={{ color: '#1F2A23' }}>{email}</strong>. It works for 10 minutes. Check spam if you can’t see it.</p>
            <div role="group" aria-label="6-digit code" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {digits.map((dg, i) => <input key={i} ref={el => { boxes.current[i] = el; }} value={dg} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`} maxLength={6}
                onChange={e => type(i, e.target.value)} onKeyDown={e => { if (e.key === 'Backspace' && !dg && i > 0) boxes.current[i - 1]?.focus(); }}
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
        {step === 'details' && (
          <form onSubmit={e => { e.preventDefault(); saveDetails(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#4D5A52' }}>We’ll use these at checkout so you don’t type them again, and the rider uses your number to find you.</p>
            <label style={labelStyle}>Full name<input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} autoComplete="name" autoFocus style={field} /></label>
            <label style={labelStyle}>Phone number<input value={d.phone} onChange={e => setD({ ...d, phone: e.target.value })} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" style={field} /></label>
            {err && <p role="alert" className="shake" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
            <button type="submit" disabled={busy} className="ub btn-solid press" style={btnSolid}>{busy ? 'Saving…' : 'Save and continue'}</button>
            <button type="button" className="ub lnk" onClick={finish} style={{ alignSelf: 'center', fontSize: 13.5, color: '#66736B' }}>Skip for now</button>
          </form>
        )}
      </div>
      <aside className="hide-xs" style={{ flex: '1 1 320px', borderRadius: 16, background: '#0B3A23', color: '#ECF1ED', padding: '34px 30px', display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden="true" style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,155,65,.35), rgba(212,155,65,0) 70%)' }} />
        <span className="serif" style={{ fontSize: 28, color: '#F6E9CF', lineHeight: 1.2 }}>Your trusted plug, remembered.</span>
        {[['Faster checkout', 'Your name, phone and addresses fill in by themselves.'], ['Every order in one place', 'Track deliveries and see what you bought.'], ['Order again in one tap', 'Put a past order back in your cart at today’s prices.']].map(([t, s2]) => (
          <div key={t} style={{ display: 'flex', gap: 12 }}><span aria-hidden="true" style={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', background: '#D49B41', color: '#0B3A23', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>✓</span><span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><strong style={{ fontSize: 14.5, fontWeight: 600, color: '#FFFFFF' }}>{t}</strong><span style={{ fontSize: 13.5, lineHeight: 1.55, opacity: 0.82 }}>{s2}</span></span></div>
        ))}
      </aside>
    </div>
  );
}

const NAV: [Tab, string, string][] = [
  ['overview', 'Overview', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z'],
  ['orders', 'My orders', 'M6 4h12l1 16H5zM9 8a3 3 0 0 0 6 0'],
  ['addresses', 'Addresses', 'M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  ['profile', 'Personal details', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5'],
  ['privacy', 'Emails & privacy', 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z'],
];

function Profile() {
  const { user, setUser, refreshUser, addresses, data, restore, byId, notify, setCartOpen, setChatOpen } = useShop();
  const router = useRouter();
  const [tab, setTabState] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [ask, setAsk] = useState<'out' | 'delete' | null>(null);
  useEffect(() => { const h = location.hash.slice(1) as Tab; if (NAV.some(n => n[0] === h)) setTabState(h); }, []);
  useEffect(() => { api<{ orders: Order[] }>('/api/me/orders').then(r => { setOrders(r.orders); setOpen(r.orders[0]?.id || null); }).catch(() => setOrders([])); }, []);
  const setTab = (t: Tab) => { setTabState(t); history.replaceState(null, '', '#' + t); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const live = (orders || []).filter(o => !['cancelled'].includes(o.status));
  const spent = live.reduce((a, o) => a + o.total - (o.refunds || []).reduce((x, r) => x + r.amount, 0), 0);
  const latest = orders?.[0];
  const active = (orders || []).filter(o => ['new', 'packed', 'route', 'issue'].includes(o.status));
  const since = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  const first = user?.name?.split(' ')[0];
  const missing = [!user?.name && 'your name', !user?.phone && 'your phone number', !addresses.length && 'a delivery address'].filter(Boolean) as string[];
  const zoneName = (id: string | null) => { const z = data.zones.find(x => x.id === id); return z ? z.state || z.label : ''; };
  const favourites = useMemo(() => {
    const t: Record<string, number> = {};
    for (const o of live) for (const it of o.items) if (byId[it.pid]) t[it.pid] = (t[it.pid] || 0) + it.qty;
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([pid]) => byId[pid]);
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null;

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

  const OrderCard = ({ o }: { o: Order }) => { const on = open === o.id; return (
    <article style={{ ...card, overflow: 'hidden' }}>
      <button type="button" className="ub drop-row" aria-expanded={on} onClick={() => setOpen(on ? null : o.id)} style={{ width: '100%', padding: '16px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', textAlign: 'left' }}>
        <span style={{ display: 'flex' }}>{o.items.slice(0, 3).map((it, i) => <span key={i} style={{ position: 'relative', width: 44, height: 44, marginLeft: i ? -12 : 0, borderRadius: 8, overflow: 'hidden', background: '#F7F4EC', border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{byId[it.pid] ? <ProductImage p={byId[it.pid]} size={9} /> : <span className="serif" style={{ color: '#8A5F1C' }}>{it.name[0]}</span>}</span>)}</span>
        <span style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 2 }}><strong style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.03em' }}>{o.id}</strong><span style={{ fontSize: 12.5, color: '#66736B' }}>{date(o.created_at)} · {o.items.reduce((a, i) => a + i.qty, 0)} items</span></span>
        <StatusPill s={o.status} />
        <span style={{ fontSize: 15, fontWeight: 600, minWidth: 90, textAlign: 'right' }}>{naira(o.total)}</span>
      </button>
      {on && (
        <div className="fade" style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <OrderSteps status={o.status} />
          {o.status === 'issue' && o.issue && <p style={{ margin: 0, padding: '12px 14px', borderRadius: 8, background: '#FBEFEB', fontSize: 13.5, lineHeight: 1.6, color: '#5C3A30' }}><strong style={{ color: '#7A2A1B' }}>{o.issue.reason || 'We hit a problem with this order.'}</strong> {o.issue.note}{o.issue.eta ? ` New date: ${o.issue.eta}.` : ''}</p>}
          {o.rider?.tracking && <p style={{ margin: 0, fontSize: 13.5 }}>Courier: <strong>{o.rider.partner}</strong> · tracking number <strong>{o.rider.tracking}</strong></p>}
          {o.rider?.driver && <p style={{ margin: 0, fontSize: 13.5 }}>Rider: <strong>{o.rider.driver}</strong>{o.rider.phone ? <> · <a href={'tel:' + o.rider.phone} style={{ color: '#0B3A23' }}>{o.rider.phone}</a></> : null}</p>}
          <div style={{ fontSize: 14 }}>
            {o.items.map((it, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid #F0ECE3' }}><span>{it.name}{it.size !== 'Package' ? ` · ${it.size}` : ''} × {it.qty}{it.swaps?.length ? <span style={{ display: 'block', fontSize: 12, color: '#8A5F1C' }}>Swaps: {it.swaps.map(w => `${w.from} → ${w.to}`).join(', ')}</span> : null}</span><span>{naira(it.price * it.qty)}</span></div>)}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F0ECE3', color: '#66736B' }}><span>Delivery · {o.speed_label}</span><span>{naira(o.delivery_fee)}</span></div>
            {o.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F0ECE3', color: '#0B3A23' }}><span>Discount</span><span>−{naira(o.discount)}</span></div>}
            <div style={{ padding: '8px 0', borderTop: '1px solid #F0ECE3', color: '#66736B', fontSize: 13 }}>To {o.address}, {o.area_label}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" className="ub btn-solid press" onClick={() => again(o)} style={{ ...btnSolid, height: 46, fontSize: 14 }}>Order again</button>
            <a href={waLink(data.business.whatsapp, `Hi Tiada, about my order ${o.id}.`)} target="_blank" rel="noopener" className="btn-out" style={{ ...btnOut, height: 46, fontSize: 14 }}>Get help with this order</a>
          </div>
        </div>
      )}
    </article>); };

  const stat = (n: string, l: string) => <div style={{ flex: '1 1 120px', padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}><div style={{ fontSize: 22, fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' }}>{n}</div><div style={{ fontSize: 12, color: 'rgba(236,241,237,0.75)' }}>{l}</div></div>;

  return (
    <div className="fade" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px clamp(16px, 3vw, 28px) 0' }}>
      <section aria-label="Your profile" style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: '#0B3A23', color: '#ECF1ED', padding: 'clamp(22px, 4vw, 34px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
        <span aria-hidden="true" style={{ position: 'absolute', right: -80, top: -90, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,155,65,.32), rgba(212,155,65,0) 70%)' }} />
        <span aria-hidden="true" style={{ width: 84, height: 84, flex: 'none', borderRadius: '50%', background: '#F6E9CF', color: '#0B3A23', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, boxShadow: '0 0 0 4px #0B3A23, 0 0 0 6px #D49B41' }}>{initials(user.name, user.email)}</span>
        <div style={{ flex: '1 1 260px', minWidth: 0, position: 'relative' }}>
          <div style={{ ...eyebrow, color: '#D49B41' }}>{since ? `Member since ${since}` : 'Tiada member'}</div>
          <h1 className="serif" style={{ margin: '6px 0 4px', fontWeight: 500, fontSize: 'clamp(28px, 4vw, 38px)', color: '#FFFFFF', lineHeight: 1.1 }}>{first ? `Hello, ${first}.` : 'Hello there.'}</h1>
          <div style={{ fontSize: 14, color: 'rgba(236,241,237,0.82)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}{user.phone ? ` · ${user.phone}` : ''}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: '1 1 340px', position: 'relative' }}>
          {stat(orders ? String(live.length) : '–', live.length === 1 ? 'Order' : 'Orders')}
          {stat(orders ? naira(spent) : '–', 'Spent with Tiada')}
          {stat(String(addresses.length), addresses.length === 1 ? 'Saved address' : 'Saved addresses')}
        </div>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginTop: 28, alignItems: 'flex-start' }}>
        <nav aria-label="Account sections" className="acct-nav noscroll" style={{ flex: '0 0 230px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(([k, l, ic]) => { const on = tab === k; return (
            <button key={k} type="button" className="ub side" aria-current={on ? 'page' : undefined} onClick={() => setTab(k)} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 46, padding: '0 14px', borderRadius: 10, fontSize: 14, fontWeight: on ? 600 : 500, color: on ? '#0B3A23' : '#4D5A52', background: on ? '#F1F5F1' : 'transparent', whiteSpace: 'nowrap' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ic} /></svg>{l}
              {k === 'orders' && active.length > 0 && <span style={{ marginLeft: 'auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: '#D49B41', color: '#0B3A23', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{active.length}</span>}
            </button>); })}
          <div className="acct-nav-sep" style={{ height: 1, background: '#ECE8DF', margin: '8px 0' }} />
          <button type="button" className="ub side" onClick={() => setAsk('out')} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 46, padding: '0 14px', borderRadius: 10, fontSize: 14, color: '#66736B', whiteSpace: 'nowrap' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" /></svg>Sign out</button>
        </nav>

        <div key={tab} className="fade" style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {tab === 'overview' && <>
            {missing.length > 0 && (
              <div style={{ ...card, padding: '16px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, background: '#FBF6EA', borderColor: '#F0E2C2' }}>
                <span style={{ flex: '1 1 240px', fontSize: 14, lineHeight: 1.55 }}><strong>Finish your profile.</strong> Add {missing.join(', ').replace(/, ([^,]*)$/, ' and $1')} so checkout fills in by itself.</span>
                <button type="button" className="ub btn-solid press" onClick={() => setTab(!user.name || !user.phone ? 'profile' : 'addresses')} style={{ ...btnSolid, height: 42, fontSize: 13.5, padding: '0 18px' }}>Add now</button>
              </div>
            )}
            <section style={{ ...card, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{latest && active.length ? 'On its way to you' : 'Your latest order'}</h2>{orders && orders.length > 1 && <button type="button" className="ub lnk" onClick={() => setTab('orders')} style={{ fontSize: 13.5, color: '#0B3A23' }}>All orders</button>}</div>
              {!orders ? <div className="skel" style={{ height: 90, borderRadius: 10 }} /> : !latest ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}><p style={{ margin: 0, flex: '1 1 240px', fontSize: 14.5, color: '#4D5A52', lineHeight: 1.6 }}>No orders yet. When you order with {user.email}, you’ll see it here with live progress.</p><Link href="/aisle/all" className="ub btn-solid press" style={{ ...btnSolid, height: 46, fontSize: 14 }}>Start shopping</Link></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}><strong style={{ fontSize: 16, letterSpacing: '0.03em' }}>{latest.id}</strong><StatusPill s={latest.status} /><span style={{ marginLeft: 'auto', fontWeight: 600 }}>{naira(latest.total)}</span></div>
                  <OrderSteps status={latest.status} />
                  <p style={{ margin: 0, fontSize: 13.5, color: '#66736B' }}>{latest.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button type="button" className="ub btn-solid press" onClick={() => again(latest)} style={{ ...btnSolid, height: 44, fontSize: 14 }}>Order again</button>
                    <button type="button" className="ub btn-out" onClick={() => { setOpen(latest.id); setTab('orders'); }} style={{ ...btnOut, height: 44, fontSize: 14 }}>See details</button>
                  </div>
                </div>
              )}
            </section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              {([['Track an order', 'With your TD code', () => router.push('/track')], ['Chat with us', 'We usually reply in minutes', () => setChatOpen(true)], ['Delivery days', 'Lagos areas and Oyo', () => router.push('/help#delivery')], ['Deals emails', user.promo_ok ? 'You’re getting them' : 'Off for now', () => setTab('privacy')]] as [string, string, () => void][]).map(([t, s2, fn]) => (
                <button key={t} type="button" className="ub pcard" onClick={fn} style={{ ...card, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>{t} →</span><span style={{ fontSize: 12.5, color: '#66736B' }}>{s2}</span></button>
              ))}
            </div>
            {favourites.length > 0 && (
              <section style={{ ...card, padding: 22 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 600 }}>Your favourites</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                  {favourites.map(p => <Link key={p.id} href={'/p/' + p.id} className="pcard" style={{ display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', color: '#1F2A23' }}><span className="pimg" style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', background: '#F7F4EC' }}><ProductImage p={p} size={14} /></span><span className="pname" style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</span></Link>)}
                </div>
              </section>
            )}
            <section style={{ ...card, padding: 22, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
              <span style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 4 }}><span style={eyebrow}>Default address</span>{addresses[0] ? <><strong style={{ fontSize: 15, fontWeight: 600 }}>{addresses[0].label}</strong><span style={{ fontSize: 14, color: '#4D5A52' }}>{addresses[0].street}, {zoneName(addresses[0].zone_id)}</span></> : <span style={{ fontSize: 14, color: '#4D5A52' }}>No address saved yet.</span>}</span>
              <button type="button" className="ub btn-out" onClick={() => setTab('addresses')} style={{ ...btnOut, height: 42, fontSize: 13.5 }}>{addresses.length ? 'Manage addresses' : 'Add an address'}</button>
            </section>
          </>}

          {tab === 'orders' && (
            <>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>My orders</h2>
              {!orders ? [0, 1].map(i => <div key={i} className="skel" style={{ height: 88, borderRadius: 12 }} />)
                : !orders.length ? <div style={{ ...card, padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}><p className="serif" style={{ margin: 0, fontSize: 22, color: '#0B3A23' }}>No orders yet</p><Link href="/aisle/all" className="ub btn-solid press" style={btnSolid}>Start shopping</Link></div>
                : orders.map(o => <OrderCard key={o.id} o={o} />)}
            </>
          )}
          {tab === 'addresses' && <><h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Addresses</h2><Addresses list={addresses} reload={refreshUser} /></>}
          {tab === 'profile' && <><h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Personal details</h2><Details /></>}
          {tab === 'privacy' && <><h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Emails & privacy</h2><Privacy onDelete={() => setAsk('delete')} onSignOut={() => setAsk('out')} /></>}
        </div>
      </div>
      {ask === 'out' && <Dialog title="Sign out?" text="You’ll need a new email code to sign in again. Your cart stays on this device." yesLabel="Sign out" onNo={() => setAsk(null)} onYes={() => { setAsk(null); signOut(); }} />}
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
    <form onSubmit={e => { e.preventDefault(); save(); }} style={{ ...card, padding: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      <label style={labelStyle}>Full name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={field} /></label>
      <label style={labelStyle}>Phone number<input value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" style={field} /></label>
      <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Email<input value={user?.email || ''} readOnly style={{ ...field, background: '#F7F5F0', color: '#66736B' }} /><span style={{ fontWeight: 400, fontSize: 12.5, color: '#66736B' }}>This is how you sign in. To change it, message us on WhatsApp.</span></label>
      {err && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13.5, fontWeight: 600, color: '#9E3522' }}>{err}</p>}
      <div style={{ gridColumn: '1 / -1' }}><button type="submit" disabled={busy || !changed} className="ub btn-solid press" style={{ ...btnSolid, height: 46, opacity: busy || !changed ? 0.5 : 1 }}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  );
}

function Privacy({ onDelete, onSignOut }: { onDelete: () => void; onSignOut: () => void }) {
  const { user, setUser, notify } = useShop();
  const promo = async (v: boolean) => {
    try { const r = await api<{ user: NonNullable<typeof user> }>('/api/me', { method: 'PATCH', json: { promo_ok: v } }); setUser(r.user); notify('ok', v ? 'You’ll get our deals emails.' : 'No more deals emails.', v ? '' : 'You’ll still get emails about your orders.'); }
    catch (e) { notify('err', 'Couldn’t change that.', (e as Error).message); }
  };
  const row = (t: string, s: string, right: React.ReactNode) => <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderTop: '1px solid #F0ECE3' }}><span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>{t}</span><span style={{ fontSize: 13, color: '#66736B', lineHeight: 1.5 }}>{s}</span></span>{right}</div>;
  return (
    <div style={{ ...card, padding: '6px 22px 10px' }}>
      {row('Deals emails', 'New stock and combo deals, a few times a month at most.', <button type="button" role="switch" aria-checked={!!user?.promo_ok} aria-label="Deals emails" className="ub" onClick={() => promo(!user?.promo_ok)} style={{ width: 44, height: 26, borderRadius: 999, background: user?.promo_ok ? '#0B3A23' : '#C9CFC9', position: 'relative', flex: 'none' }}><span style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF', transition: 'transform .2s', transform: `translateX(${user?.promo_ok ? 18 : 0}px)` }} /></button>)}
      {row('Order emails', 'Receipts and delivery updates. These always come, so you know where your order is.', <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0B3A23' }}>Always on</span>)}
      {row('Signed in on this device', 'You stay signed in while you keep shopping. Sign out if this is a shared phone or computer.', <button type="button" className="ub btn-out" onClick={onSignOut} style={{ ...btnOut, height: 40, fontSize: 13.5, padding: '0 16px' }}>Sign out</button>)}
      {row('Your data', 'See our privacy policy for what we keep and why.', <Link href="/privacy" className="lnk" style={{ fontSize: 13.5, color: '#0B3A23' }}>Privacy policy</Link>)}
      {row('Delete account', 'Removes your details, addresses and reviews for good.', <button type="button" className="ub lnk" onClick={onDelete} style={{ fontSize: 13.5, color: '#9E3522' }}>Delete</button>)}
    </div>
  );
}
