'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import type { Rider } from './types';
import { Btn, Empty, Section, Switch, call, card, fmtPhone, input, lab, useToast } from './ui';

/** Riders: each gets a private link for their phone. No password: switch a rider off or make a new link to stop it working. */
export default function Riders({ c }: { c: Ctx }) {
  const { d, reload } = c;
  const toast = useToast();
  const [f, setF] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const site = typeof window !== 'undefined' ? window.location.origin : '';
  const link = (r: Rider) => `${site}/rider/${r.token}`;
  const out = d.orders.filter(o => o.status === 'route');
  const onRun = (r: Rider) => out.filter(o => (o.rider as { rider_id?: string } | null)?.rider_id === r.id).length;
  const add = async () => {
    if (f.name.trim().length < 2) return toast('err', 'Add the rider’s name.');
    setBusy(true);
    try { await call('/api/admin/riders', { action: 'add', name: f.name, phone: f.phone || undefined }); setF({ name: '', phone: '' }); await reload(); toast('ok', `${f.name} added.`, 'Send them their link on WhatsApp.'); }
    catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } finally { setBusy(false); }
  };
  const copy = async (r: Rider) => { try { await navigator.clipboard.writeText(link(r)); toast('ok', 'Link copied.', `Send it to ${r.name}.`); } catch { toast('err', 'Couldn’t copy.', link(r)); } };
  const wa = (r: Rider) => `https://wa.me/${(r.phone || '').replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hi ${r.name.split(' ')[0]}, this is your Tiada rider page. Open it to see your deliveries:\n${link(r)}\n\nAt each door, ask the customer for their 4-digit delivery code and type it in to mark the order delivered. Keep this link private.`)}`;
  const act = async (body: Record<string, unknown>, msg: string) => { try { await call('/api/admin/riders', body); await reload(); toast('ok', msg); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 18, alignItems: 'start' }}>
      <section style={{ ...card, overflow: 'hidden' }}>
        {d.riders.map(r => (
          <div key={r.id} style={{ padding: '14px 18px', borderBottom: '1px solid #F0ECE3', display: 'flex', flexDirection: 'column', gap: 10, opacity: r.active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#E6EEE8', color: '#0B3A23', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{r.name.slice(0, 1).toUpperCase()}</span>
              <span style={{ flex: 1, minWidth: 0 }}><strong>{r.name}</strong><span style={{ display: 'block', fontSize: 12.5, color: '#4E5A53' }}>{r.phone ? fmtPhone(r.phone) : 'No phone saved'} · {onRun(r)} on the way now</span></span>
              <Switch on={r.active} label={`${r.name} can use their link`} onChange={v => act({ action: 'active', id: r.id, active: v }, v ? `${r.name} is on.` : `${r.name} is off. Their link no longer works.`)} />
            </div>
            {r.active && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Btn kind="out" small onClick={() => copy(r)}>Copy link</Btn>
              {r.phone && <a href={wa(r)} target="_blank" rel="noopener" className="ub" style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #DCD6CA', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', color: '#0B3A23' }}>Send on WhatsApp</a>}
              <a href={link(r)} target="_blank" rel="noopener" className="ub" style={{ height: 34, padding: '0 12px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', color: '#0B3A23', textDecoration: 'underline', textUnderlineOffset: 3 }}>Open their page</a>
              <Btn kind="text" small onClick={() => act({ action: 'newlink', id: r.id }, 'New link made. The old one no longer works; send the new one.')}>New link</Btn>
            </div>}
          </div>
        ))}
        {!d.riders.length && <Empty title="No riders yet." text="Add your first rider on the right. They get a private link for their phone." />}
      </section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Section title="Add a rider">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <label style={lab}>Name<input value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} placeholder="e.g. Musa Bello" style={input} /></label>
            <label style={lab}>Phone (for WhatsApp)<input value={f.phone} onChange={e => setF(x => ({ ...x, phone: e.target.value }))} inputMode="tel" placeholder="0803 000 0000" style={input} /></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><Btn disabled={busy} onClick={add}>{busy ? 'Adding…' : 'Add rider'}</Btn></div>
        </Section>
        <Section title="How it works">
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7, color: '#3C4741' }}>
            <li>Add a rider and send them their private link on WhatsApp. No password needed.</li>
            <li>When you press <strong>Send it out</strong> on an order (or on a run sheet), pick the rider. The order appears on their page with the address, a Google Maps button and a call button. The customer gets the rider’s name and number.</li>
            <li>Every customer gets a 4-digit <strong>delivery code</strong> by email when they pay, and again when the order is on the way.</li>
            <li>At the door, the rider asks for the code and types it in. The order is marked delivered and the customer is emailed. Without the right code it can’t be marked delivered, so deliveries can’t be faked.</li>
            <li>If the customer can’t find their code, call them from the office to check it’s really them. Then give the rider the code shown on the order in Orders.</li>
            <li>If a rider leaves or loses their phone, switch them off or press <strong>New link</strong>.</li>
          </ol>
        </Section>
      </div>
    </div>
  );
}
