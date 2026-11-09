'use client';
import { useMemo, useState } from 'react';
import type { Ctx } from './Desk';
import { DEFAULT_OYO, OYO_GROUPS, OyoConfig, oyoAreas, parseSpot } from '@/lib/oyo';
import { Section, Btn, Switch, call, useToast, input, lab, naira } from './ui';

/** Oyo fees by distance. The spot is only stored here and never shown to customers. */
export default function OyoFees({ c }: { c: Ctx }) {
  const { d, reload } = c;
  const toast = useToast();
  const owner = d.me.role === 'Owner';
  const saved: OyoConfig = { ...DEFAULT_OYO, ...(d.settings.oyo || {}) };
  const [cfg, setCfg] = useState<OyoConfig>(saved);
  const [spot, setSpot] = useState('');
  const [editSpot, setEditSpot] = useState(!saved.hub);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const fallback = d.zones.find(z => z.id === 'st:Oyo')?.fee || 4500;
  const areas = useMemo(() => oyoAreas(cfg, fallback), [cfg, fallback]);
  const parsed = spot.trim() ? parseSpot(spot) : null;
  const n = (v: string) => Number(v.replace(/\D/g, '')) || 0;

  const save = async () => {
    const hub = spot.trim() ? parsed : cfg.hub;
    if (spot.trim() && !parsed) return toast('err', 'We couldn’t read that spot.', 'Paste the numbers from Google Maps, like 7.4290, 3.9110.');
    setBusy(true);
    try { await call('/api/admin/settings', { key: 'oyo', value: { ...cfg, hub } }); setCfg(x => ({ ...x, hub })); setSpot(''); setEditSpot(false); await reload(); toast('ok', 'Oyo fees saved.', 'Checkout uses them within a minute.'); }
    catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } finally { setBusy(false); }
  };
  const setFee = (id: string, v: string) => setCfg(x => { const fees = { ...x.fees }; if (v === '') delete fees[id]; else fees[id] = n(v); return { ...x, fees }; });
  const list = showAll ? areas : areas.filter(a => a.group === OYO_GROUPS[0]);

  return (
    <Section title="Oyo State fees" sub="Customers pick their area. The fee is worked out from how far it is from your Oyo spot. Your spot is never shown to customers.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ ...lab, gridColumn: '1 / -1' }}>
          Your spot in Oyo
          {!editSpot && cfg.hub ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 400 }}><span style={{ fontSize: 13.5, color: '#0B3A23' }}>Your Iseyin pin is saved. Customers can’t see it.</span>{owner && <Btn kind="text" small onClick={() => setEditSpot(true)}>Change</Btn>}</span>
          ) : <>
            <input value={spot} onChange={e => setSpot(e.target.value)} disabled={!owner} placeholder="Paste from Google Maps, e.g. 7.9671, 3.6012" style={{ ...input, borderColor: spot.trim() && !parsed ? '#B8402B' : '#DCD6CA' }} />
            <span style={{ fontWeight: 400, fontSize: 12.5, color: spot.trim() && !parsed ? '#9E3522' : '#66736B', lineHeight: 1.5 }}>{spot.trim() ? (parsed ? 'Got it. Press Save to use it.' : 'That doesn’t look like a spot in Oyo State.') : 'In Google Maps, press and hold on your building. The numbers appear at the top: copy them and paste here. A Google Maps link works too.'}</span>
          </>}
        </div>
        <label style={lab}>Starting fee (₦)<input value={cfg.start} onChange={e => setCfg(x => ({ ...x, start: n(e.target.value) }))} inputMode="numeric" disabled={!owner} style={input} /></label>
        <label style={lab}>Plus, for every km (₦)<input value={cfg.perKm} onChange={e => setCfg(x => ({ ...x, perKm: n(e.target.value) }))} inputMode="numeric" disabled={!owner} style={input} /></label>
      </div>
      {!cfg.hub && !parsed && <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 8, background: '#FBF2DE', color: '#5C430F', fontSize: 13 }}>For now, distances are measured from the middle of Iseyin town. Paste your branch’s exact pin above for exact fees.</p>}
      <div style={{ marginTop: 14 }}>
        {list.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #F0ECE3', opacity: a.on ? 1 : 0.5 }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{a.name}</span><span style={{ fontSize: 12, color: '#66736B' }}>{a.group} · about {a.km} km by road · works out at {naira(a.auto)}</span></span>
            <input value={cfg.fees[a.id.slice(4)] ?? ''} onChange={e => setFee(a.id.slice(4), e.target.value)} placeholder={String(a.auto)} inputMode="numeric" aria-label={`Fee for ${a.name}`} title="Leave empty to use the worked-out fee" disabled={!owner} style={{ ...input, width: 96, height: 36 }} />
            <Switch on={a.on} label={`Deliver to ${a.name}`} onChange={v => owner && setCfg(x => ({ ...x, off: v ? x.off.filter(o => o !== a.id.slice(4)) : x.off.concat(a.id.slice(4)) }))} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
        <Btn kind="text" small onClick={() => setShowAll(!showAll)}>{showAll ? 'Show Iseyin and nearby only' : 'Show Ibadan and other towns too'}</Btn>
        {owner && <Btn disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save Oyo fees'}</Btn>}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: '#66736B' }}>Type a fee in an area’s box to set it yourself. Leave it empty to use the worked-out fee. Switch an area off to stop deliveries there.</p>
    </Section>
  );
}
