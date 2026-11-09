'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import RegionFees from './RegionFees';
import { Section, Btn, Switch, call, useToast, input, lab, naira } from './ui';

/** Delivery: fees by distance for Lagos and Oyo, plus the extra charges on top. */
export default function Delivery({ c }: { c: Ctx }) {
  const { d, reload } = c;
  const toast = useToast();
  const fees = d.settings.fees;
  const owner = d.me.role === 'Owner';
  const [f, setF] = useState({ min: fees.min, lagosKg: fees.lagosKg, interKg: fees.interKg, van: fees.van, same: fees.same, express: fees.express, eco: fees.eco });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string[]>(d.openStates || ['st:Oyo']);
  const oyoOn = open.includes('st:Oyo');
  const toggleOyo = async (on: boolean) => {
    const next = on ? Array.from(new Set(open.concat('st:Oyo'))) : open.filter(x => x !== 'st:Oyo');
    setOpen(next);
    try { await call('/api/admin/settings', { key: 'open_states', value: next }); await reload(); toast('ok', on ? 'Oyo deliveries are on.' : 'Oyo deliveries are off.', 'Checkout shows the change within a minute.'); }
    catch (e) { setOpen(open); toast('err', 'That didn’t save.', (e as Error).message); }
  };
  const n = (v: string) => Number(v.replace(/\D/g, '')) || 0;
  const F = (k: keyof typeof f, l: string, s?: string) => <label style={lab}>{l}<input value={f[k]} onChange={e => setF(x => ({ ...x, [k]: n(e.target.value) }))} inputMode="numeric" disabled={!owner} style={input} />{s && <span style={{ fontWeight: 400, fontSize: 12, color: '#66736B' }}>{s}</span>}</label>;
  const save = async () => { setBusy(true); try { await call('/api/admin/fees', { ...f, areas: [], regions: {} }); await reload(); toast('ok', 'Extra charges saved.', 'Checkout uses them straight away.'); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } finally { setBusy(false); } };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: 18, alignItems: 'start' }}>
      <RegionFees c={c} region="Lagos" />
      {oyoOn ? <RegionFees c={c} region="Oyo" extra={<Switch on label="Deliver to Oyo State" onChange={v => owner && toggleOyo(v)} />} /> : (
        <Section title="Oyo State delivery" sub="Switched off. Customers in Oyo see “we don’t deliver there yet”." right={<Switch on={false} label="Deliver to Oyo State" onChange={v => owner && toggleOyo(v)} />}><span /></Section>
      )}
      <Section title="Extra charges" sub="Added on top of the distance fee.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {F('min', 'Smallest order (₦)', `Orders under ${naira(f.min)} can’t check out.`)}
          {F('same', 'Priority delivery (₦ extra)', 'Today or next morning where you can.')}
          {F('lagosKg', 'Per kg over 5 kg (₦)', 'For heavy orders, like big food combos.')}
          {F('van', 'Van for orders over 20 kg (₦)')}
        </div>
        {owner && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><Btn disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save extra charges'}</Btn></div>}
      </Section>
    </div>
  );
}
