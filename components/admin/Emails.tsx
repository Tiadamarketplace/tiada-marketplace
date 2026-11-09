'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import { card, Btn, Confirm, call, useToast, input, lab } from './ui';

export default function Emails({ c }: { c: Ctx }) {
  const { d } = c;
  const toast = useToast();
  const [f, setF] = useState({ subject: '', body: '', audience: 'promo' as 'promo' | 'all' });
  const [busy, setBusy] = useState(false); const [ask, setAsk] = useState(false); const [err, setErr] = useState('');
  const optIn = d.customers.filter(x => x.promo_ok).length;
  const n = f.audience === 'promo' ? optIn : d.customers.length;
  const send = async (audience: 'promo' | 'all' | 'test') => {
    setBusy(true); setErr('');
    try { const r = await call<{ sent: number; total: number }>('/api/admin/broadcast', { ...f, audience }); toast('ok', audience === 'test' ? 'Test sent to your email.' : `Sent to ${r.sent} of ${r.total}.`); if (audience !== 'test') setF({ subject: '', body: '', audience: f.audience }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); setAsk(false); }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
      <section style={{ ...card, flex: '999 1 480px', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div role="radiogroup" aria-label="Who gets it" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {([['promo', 'Deals and news', `${optIn} customers who said yes to deals emails`], ['all', 'Service notice', `All ${d.customers.length} customers. Only for things like holiday closures or delivery changes.`]] as const).map(([k, l, s]) => (
            <button key={k} type="button" role="radio" aria-checked={f.audience === k} className="ub" onClick={() => setF(x => ({ ...x, audience: k }))} style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${f.audience === k ? '#0B3A23' : '#E4DFD3'}`, background: f.audience === k ? '#F1F5F1' : '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12, color: '#66736B', lineHeight: 1.45 }}>{s}</span></button>
          ))}
        </div>
        <label style={lab}>Subject<input value={f.subject} maxLength={80} onChange={e => setF(x => ({ ...x, subject: e.target.value }))} placeholder="Fresh cereals just arrived" style={input} /></label>
        <label style={lab}>Message<textarea rows={8} value={f.body} maxLength={1500} onChange={e => setF(x => ({ ...x, body: e.target.value }))} placeholder="Write it like you’d text a regular customer. Short is good." /></label>
        {err && <p role="alert" style={{ margin: 0, padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5 }}>{err}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
          <Btn kind="out" disabled={busy || !f.subject || !f.body} onClick={() => send('test')}>Send me a test</Btn>
          <Btn disabled={busy || !f.subject || !f.body || !n} onClick={() => setAsk(true)}>Send to {n} customer{n === 1 ? '' : 's'}</Btn>
        </div>
      </section>
      <aside style={{ ...card, flex: '1 1 260px', padding: 20, fontSize: 13.5, lineHeight: 1.65, color: '#4D5A52' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 15, color: '#1F2A23' }}>Good to know</h2>
        <p style={{ margin: '0 0 8px' }}>It goes out in the same Tiada style as your order emails, with a button to the shop.</p>
        <p style={{ margin: '0 0 8px' }}>Deals emails only go to people who said yes. {d.subscribers} people have also joined from the footer.</p>
        <p style={{ margin: 0 }}>Order emails (confirmed, packed, on the way, delivered) send on their own. You don’t need to do anything.</p>
      </aside>
      {ask && <Confirm title={`Send to ${n} customers?`} text={`“${f.subject}” goes out now. You can’t unsend it.`} yes="Send now" onNo={() => setAsk(false)} onYes={() => send(f.audience)} />}
    </div>
  );
}
