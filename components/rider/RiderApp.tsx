'use client';
import { useCallback, useEffect, useState } from 'react';

type Drop = { id: string; name: string; phone: string; address: string; landmark: string | null; area: string | null; note: string | null; items: string[]; kg: number; map: string; collect: number; needsCode: boolean };
type Done = { id: string; name: string; area_label: string | null; updated_at: string };
type Data = { rider: { name: string }; drops: Drop[]; done: Done[] };

const G = '#0B3A23', INK = '#1F2A23', SUB = '#3C4741', LINE = '#E4DFD3';
const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
const REASONS = ['Customer not answering', 'Customer not at home', 'Can’t find the address', 'Customer refused the order', 'Customer can’t find the code'];
const wa = (p: string) => `https://wa.me/${p.replace(/\D/g, '').replace(/^0/, '234')}`;

async function call<T>(token: string, json?: unknown): Promise<T> {
  const r = await fetch(`/api/rider/${token}`, json ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) } : { cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Check your internet and try again.');
  return j as T;
}

/** The rider's phone page: today's drops, maps, calls, and the customer's code to mark each one delivered. */
export default function RiderApp({ token }: { token: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try { setD(await call<Data>(token)); setErr(''); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }, [token]);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  if (!d) return (
    <main style={{ minHeight: '100svh', background: '#F6F3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      {err ? <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}><strong style={{ fontSize: 20, color: INK }}>Can’t open your page</strong><p style={{ margin: 0, fontSize: 15, color: SUB, lineHeight: 1.6 }}>{err}</p><button type="button" onClick={load} style={btn(G)}>Try again</button></div>
        : <span style={{ fontSize: 15, color: SUB, display: 'flex', alignItems: 'center', gap: 10 }}><Spin dark />Loading your deliveries…</span>}
    </main>
  );
  return (
    <main style={{ minHeight: '100svh', background: '#F6F3EC', color: INK, paddingBottom: 40 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 5, background: G, color: '#FFFFFF', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D49B41', fontWeight: 600 }}>Tiada rider</span><strong style={{ fontSize: 18 }}>Hi {d.rider.name.split(' ')[0]}</strong></span>
        <button type="button" onClick={load} disabled={busy} aria-label="Refresh" style={{ height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.35)', color: '#FFFFFF', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, background: 'transparent' }}>{busy ? <Spin /> : null}Refresh</button>
      </header>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && <p role="alert" style={{ margin: 0, padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 14 }}>{err}</p>}
        <p style={{ margin: 0, fontSize: 15, color: SUB }}>{d.drops.length ? `${d.drops.length} ${d.drops.length === 1 ? 'delivery' : 'deliveries'} to make.` : 'No deliveries right now. New ones show here when the office sends them out.'}</p>
        {d.drops.map(x => <DropCard key={x.id} x={x} token={token} onDone={load} />)}
        {d.done.length > 0 && (
          <section style={{ marginTop: 10 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: SUB }}>Delivered today · {d.done.length}</h2>
            {d.done.map(x => <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderTop: `1px solid ${LINE}`, fontSize: 14.5 }}><span>✓ {x.id} · {x.name}</span><span style={{ color: SUB }}>{new Date(x.updated_at).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true })}</span></div>)}
          </section>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 13, color: SUB, lineHeight: 1.6 }}>Keep this link private. If you lose your phone, tell the office so they can switch it off.</p>
      </div>
    </main>
  );
}

function DropCard({ x, token, onDone }: { x: Drop; token: string; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [prob, setProb] = useState(false);
  const deliver = async () => {
    if (x.needsCode && code.replace(/\D/g, '').length !== 4) return setMsg({ ok: false, t: 'Type the 4-digit code from the customer.' });
    setBusy(true); setMsg(null);
    try { await call(token, { action: 'deliver', id: x.id, code }); setMsg({ ok: true, t: 'Delivered. The customer has been emailed.' }); setTimeout(onDone, 1200); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  const report = async (reason: string) => {
    setBusy(true); setMsg(null);
    try { await call(token, { action: 'problem', id: x.id, reason }); setProb(false); setMsg({ ok: true, t: 'The office has been told. They’ll call you or the customer.' }); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <article style={{ background: '#FFFFFF', borderRadius: 14, border: `1px solid ${LINE}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}><strong style={{ fontSize: 18 }}>{x.name}</strong><span style={{ fontSize: 13, color: SUB }}>{x.id}</span></div>
      <div style={{ fontSize: 15.5, lineHeight: 1.55 }}>{x.address}{x.landmark && <span style={{ display: 'block', color: SUB }}>{x.landmark}</span>}{x.area && <span style={{ display: 'block', color: SUB, fontSize: 14 }}>{x.area}</span>}</div>
      {x.note && <p style={{ margin: 0, padding: '8px 12px', borderRadius: 8, background: '#FBF2DE', fontSize: 14 }}><strong>Customer’s note:</strong> {x.note}</p>}
      {x.collect > 0 && <p style={{ margin: 0, padding: '8px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 14.5, fontWeight: 600 }}>Collect {naira(x.collect)} from the customer before handing over.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <a href={x.map} target="_blank" rel="noopener" style={btn(G)}>Map</a>
        <a href={'tel:' + x.phone} style={btn('#FFFFFF', G)}>Call</a>
        <a href={wa(x.phone)} target="_blank" rel="noopener" style={btn('#FFFFFF', G)}>WhatsApp</a>
      </div>
      <details style={{ fontSize: 14, color: SUB }}><summary style={{ cursor: 'pointer' }}>{x.items.length} item{x.items.length === 1 ? '' : 's'} · {x.kg} kg</summary><ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>{x.items.map((t, i) => <li key={i}>{t}</li>)}</ul></details>
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {x.needsCode ? <>
          <label htmlFor={'c-' + x.id} style={{ fontSize: 14, fontWeight: 600 }}>Customer’s delivery code</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id={'c-' + x.id} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setMsg(null); }} inputMode="numeric" autoComplete="off" placeholder="• • • •" maxLength={4}
              style={{ flex: 1, minWidth: 0, height: 54, borderRadius: 10, border: `1.5px solid ${msg && !msg.ok ? '#B3261E' : '#CFC8BA'}`, fontSize: 24, fontWeight: 700, letterSpacing: '0.4em', textAlign: 'center' }} />
            <button type="button" onClick={deliver} disabled={busy} style={{ ...btn(G), height: 54, padding: '0 18px', flex: 'none', opacity: busy ? 0.7 : 1 }}>{busy ? <Spin /> : null}Delivered</button>
          </div>
        </> : <button type="button" onClick={deliver} disabled={busy} style={{ ...btn(G), height: 52, opacity: busy ? 0.7 : 1 }}>{busy ? <Spin /> : null}Mark delivered</button>}
        {msg && <p role={msg.ok ? 'status' : 'alert'} style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: msg.ok ? '#1E6B43' : '#B3261E' }}>{msg.ok ? '✓ ' : ''}{msg.t}</p>}
        {!prob ? <button type="button" onClick={() => setProb(true)} style={{ alignSelf: 'flex-start', fontSize: 14, color: SUB, textDecoration: 'underline', textUnderlineOffset: 3, background: 'none', border: 'none', padding: '6px 0' }}>Can’t deliver?</button> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REASONS.map(r => <button key={r} type="button" disabled={busy} onClick={() => report(r)} style={{ height: 38, padding: '0 12px', borderRadius: 999, border: '1px solid #CFC8BA', background: '#FFFFFF', fontSize: 13.5 }}>{r}</button>)}
            <button type="button" onClick={() => setProb(false)} style={{ height: 38, padding: '0 12px', fontSize: 13.5, color: SUB, background: 'none', border: 'none' }}>Cancel</button>
          </div>
        )}
      </div>
    </article>
  );
}

function btn(bg: string, fg = '#FFFFFF'): React.CSSProperties {
  return { height: 46, borderRadius: 10, background: bg, color: fg, border: bg === '#FFFFFF' ? `1.5px solid ${fg}` : 'none', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' };
}
function Spin({ dark }: { dark?: boolean }) {
  return <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${dark ? 'rgba(11,58,35,0.2)' : 'rgba(255,255,255,0.35)'}`, borderTopColor: dark ? G : '#FFFFFF', animation: 'spin .8s linear infinite', display: 'inline-block' }} />;
}
