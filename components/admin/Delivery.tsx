'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import { Section, Btn, call, useToast, input, lab, naira } from './ui';

const REG: Record<string, string> = { sw: 'South West', ss: 'South South & South East', nc: 'North Central', nw: 'North' };
export default function Delivery({ c }: { c: Ctx }) {
  const { d, reload } = c;
  const toast = useToast();
  const fees = d.settings.fees;
  const lagos = d.zones.filter(z => !z.state);
  const regionFee = (r: string) => fees.regions?.[r]?.fee ?? d.zones.find(z => z.region === r)?.fee ?? 0;
  const [f, setF] = useState({ min: fees.min, lagosKg: fees.lagosKg, interKg: fees.interKg, van: fees.van, same: fees.same, express: fees.express, eco: fees.eco });
  const [areas, setAreas] = useState<Record<string, number>>(Object.fromEntries(lagos.map(z => [z.id, z.fee])));
  const [regions, setRegions] = useState<Record<string, number>>(Object.fromEntries(Object.keys(REG).map(r => [r, regionFee(r)])));
  const [busy, setBusy] = useState(false);
  const owner = d.me.role === 'Owner';
  const n = (v: string) => Number(v.replace(/\D/g, '')) || 0;
  const F = (k: keyof typeof f, l: string, s?: string) => <label style={lab}>{l}<input value={f[k]} onChange={e => setF(x => ({ ...x, [k]: n(e.target.value) }))} inputMode="numeric" disabled={!owner} style={input} />{s && <span style={{ fontWeight: 400, fontSize: 12, color: '#66736B' }}>{s}</span>}</label>;
  const save = async () => { setBusy(true); try { await call('/api/admin/fees', { ...f, areas: Object.entries(areas).map(([id, fee]) => ({ id, fee })), regions }); await reload(); toast('ok', 'Delivery fees saved.', 'Checkout uses them straight away.'); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } finally { setBusy(false); } };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: 18, alignItems: 'start' }}>
      <Section title="Lagos areas" sub="The fee and delivery day for each area. Customers pick their area at checkout.">
        {lagos.map(z => (
          <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #F0ECE3' }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontWeight: 600, fontSize: 13.5 }}>{z.label}</span><span style={{ fontSize: 12, color: '#66736B' }}>{z.day ? `${z.day} run` : 'No set day'} · {z.km} km from the hub</span></span>
            <input value={areas[z.id] ?? 0} onChange={e => setAreas(x => ({ ...x, [z.id]: n(e.target.value) }))} inputMode="numeric" aria-label={`Fee for ${z.label}`} disabled={!owner} style={{ ...input, width: 110, height: 38 }} />
          </div>
        ))}
      </Section>
      <Section title="Outside Lagos" sub="Courier fee by region, before extra weight.">
        {Object.entries(REG).map(([r, l]) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #F0ECE3' }}>
            <span style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 600, fontSize: 13.5 }}>{l}</span><span style={{ fontSize: 12, color: '#66736B' }}>{d.zones.filter(z => z.region === r).map(z => z.state).join(', ')}</span></span>
            <input value={regions[r]} onChange={e => setRegions(x => ({ ...x, [r]: n(e.target.value) }))} inputMode="numeric" aria-label={`Fee for ${l}`} disabled={!owner} style={{ ...input, width: 110, height: 38 }} />
          </div>
        ))}
      </Section>
      <Section title="Rules" sub="Extra charges added on top of the area fee.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {F('min', 'Smallest order (₦)', `Orders under ${naira(f.min)} can’t check out.`)}
          {F('same', 'Priority delivery in Lagos (₦ extra)', 'Today or next morning.')}
          {F('lagosKg', 'Lagos, per kg over 5 kg (₦)')}{F('van', 'Lagos, van for orders over 20 kg (₦)')}
          {F('interKg', 'Outside Lagos, per kg over 5 kg (₦)')}{F('express', 'Express courier (₦ extra)')}
        </div>
      </Section>
      {owner && <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}><Btn disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save delivery fees'}</Btn></div>}
    </div>
  );
}
