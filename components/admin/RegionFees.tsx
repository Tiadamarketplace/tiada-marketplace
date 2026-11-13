'use client';
import { useMemo, useState } from 'react';
import type { Ctx } from './Desk';
import { CENTRE, RegionCfg, RegionName, SAMPLES, cleanRegion, feeFor, roadKm } from '@/lib/regions-core';
import { parseSpot } from '@/lib/oyo';
import { Section, Btn, call, useToast, input, lab, naira } from './ui';

const BOUNDS: Record<RegionName, [number, number, number, number]> = { Lagos: [6.3, 6.8, 2.7, 4.4], Oyo: [6.8, 9.3, 2.6, 4.7] };
const WHERE: Record<RegionName, string> = { Lagos: 'Lagos hub', Oyo: 'Iseyin branch' };

/** Delivery fees by distance for one state. The pin is only stored here and never shown to customers. */
export default function RegionFees({ c, region, extra }: { c: Ctx; region: RegionName; extra?: React.ReactNode }) {
  const { d, reload } = c;
  const toast = useToast();
  const owner = d.me.role === 'Owner';
  const saved = cleanRegion(region, region === 'Lagos' ? d.settings.lagos : d.settings.oyo);
  const [cfg, setCfg] = useState<RegionCfg>(saved);
  const [spot, setSpot] = useState('');
  const [editSpot, setEditSpot] = useState(!saved.hub);
  const [busy, setBusy] = useState(false);
  const raw = spot.trim() ? parseSpot(spot, BOUNDS[region]) : null;
  const n = (v: string) => Number(v.replace(/\D/g, '')) || 0;
  const from = raw || cfg.hub || CENTRE[region];
  const rows = useMemo(() => SAMPLES[region].map(([name, lat, lng]) => { const km = Math.round(roadKm(from, { lat, lng })); return { name, km, fee: feeFor(cfg, km) }; }), [from, cfg, region]);

  const save = async () => {
    if (spot.trim() && !raw) return toast('err', 'We couldn’t read that pin.', `Paste the numbers from Google Maps for a spot in ${region}, like ${region === 'Lagos' ? '6.6156, 3.3209' : '7.9671, 3.6012'}.`);
    const hub = raw || cfg.hub;
    setBusy(true);
    try { await call('/api/admin/settings', { key: region === 'Lagos' ? 'lagos' : 'oyo', value: { ...cfg, hub } }); setCfg(x => ({ ...x, hub })); setSpot(''); setEditSpot(false); await reload(); toast('ok', `${region} fees saved.`, 'Checkout uses them within a minute.'); }
    catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } finally { setBusy(false); }
  };
  const num = (k: 'start' | 'perKm' | 'max' | 'range', l: string, hint?: string) => (
    <label style={lab}>{l}<input value={cfg[k]} onChange={e => setCfg(x => ({ ...x, [k]: n(e.target.value) }))} inputMode="numeric" disabled={!owner} style={input} />{hint && <span style={{ fontWeight: 400, fontSize: 12, color: '#66736B' }}>{hint}</span>}</label>
  );

  return (
    <Section title={region === 'Lagos' ? 'Lagos delivery' : 'Oyo State delivery'} sub={`Customers type their address at checkout. The fee is worked out from how far it is from your ${WHERE[region]}. Your pin is never shown to customers.`} right={extra}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <div style={{ ...lab, gridColumn: '1 / -1' }}>
          Your pin ({WHERE[region]})
          {!editSpot && cfg.hub ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 400 }}><span style={{ fontSize: 13.5, color: '#0B3A23' }}>Saved. Customers can’t see it.</span>{owner && <Btn kind="text" small onClick={() => setEditSpot(true)}>Change pin</Btn>}</span>
          ) : <>
            <input value={spot} onChange={e => setSpot(e.target.value)} disabled={!owner} placeholder={`Paste from Google Maps, e.g. ${region === 'Lagos' ? '6.6156, 3.3209' : '7.9671, 3.6012'}`} style={{ ...input, borderColor: spot.trim() && !raw ? '#B8402B' : '#DCD6CA' }} />
            <span style={{ fontWeight: 400, fontSize: 12.5, color: spot.trim() && !raw ? '#9E3522' : '#66736B', lineHeight: 1.5 }}>{spot.trim() ? (raw ? 'Got it. Press Save to use it.' : `That doesn’t look like a spot in ${region}.`) : 'In Google Maps, press and hold on your building. The numbers appear at the top: copy them and paste here.'}</span>
          </>}
        </div>
        {num('start', 'Starting fee (₦)')}
        {num('perKm', 'Plus, for every km (₦)')}
        {num('max', 'Never more than (₦)', 'Far addresses pay this at most.')}
        <label style={lab}>Usually arrives<input value={cfg.days} onChange={e => setCfg(x => ({ ...x, days: e.target.value.slice(0, 40) }))} disabled={!owner} placeholder="next day" style={input} /><span style={{ fontWeight: 400, fontSize: 12, color: '#66736B' }}>Shown as “usually {cfg.days || '…'}”.</span></label>
      </div>
      {!cfg.hub && !raw && <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 8, background: '#FBF2DE', color: '#5C430F', fontSize: 13 }}>For now, distances are measured from the middle of {region === 'Lagos' ? 'Ikeja' : 'Iseyin town'}. Paste your exact pin above for exact fees.</p>}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#66736B', marginBottom: 4 }}>What customers pay</div>
        {rows.map(r => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid #F0ECE3', fontSize: 13.5 }}>
            <span style={{ flex: 1 }}>{r.name} <span style={{ fontSize: 12, color: '#66736B' }}>· about {r.km} km</span></span>
            <span style={{ fontWeight: 600, color: r.fee == null ? '#9E3522' : '#1F2A23' }}>{r.fee == null ? 'Too far' : naira(r.fee)}</span>
          </div>
        ))}
      </div>
      {owner && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><Btn disabled={busy} onClick={save}>{busy ? 'Saving…' : `Save ${region} fees`}</Btn></div>}
    </Section>
  );
}
