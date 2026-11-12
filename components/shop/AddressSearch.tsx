'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { api, naira } from '@/lib/shop-client';
import { field } from './ui';
import { matchLocal } from '@/lib/places-ng';

export type PlaceRef = { id: string; lat?: number | null; lng?: number | null; s?: string | null };
type Sug = { id: string; main: string; secondary: string; lat?: number; lng?: number; local?: boolean };
export type Pick = { text: string; place: PlaceRef; ok: true; label: string; state: string; city: string; fee: number; days: string; lat?: number; lng?: number } | { text: string; place: PlaceRef; ok: false; label?: string; reason: string };

const lbl = (s: Sug) => [s.main, ...s.secondary.split(', ')].filter((x, i, a) => x && a.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i).join(', ');
const newSession = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

/**
 * Address box with map suggestions. As soon as the customer picks one, it asks the server
 * whether we deliver there: green with the fee, or a red note saying we don't reach that place yet.
 */
export default function AddressSearch({ id, initial, onPick, invalid, showFee = true, placeholder, boxLabel, state }: {
  id?: string; initial?: { text: string; place: PlaceRef | null } | null; onPick: (p: Pick | null, text: string) => void; invalid?: boolean; showFee?: boolean; placeholder?: string;
  /** show as a checkout box with this label inside */ boxLabel?: string; /** the state the customer chose, to point suggestions there */ state?: string;
}) {
  const [text, setText] = useState(initial?.text || '');
  const [list, setList] = useState<Sug[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<Pick | null>(null);
  const [checking, setChecking] = useState(false);
  const [area, setArea] = useState(false);
  const session = useRef(newSession());
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const skip = useRef(false);
  const cache = useRef(new Map<string, Sug[]>());
  const [typing, setTyping] = useState(false);

  const choose = async (place: PlaceRef, label: string) => {
    setArea(place.id.startsWith('o:area:')); skip.current = true; setText(label); setOpen(false); setTyping(false); setList([]); setChecking(true);
    try {
      const r = await api<{ ok: boolean; label?: string; state?: string; city?: string; fee?: number; days?: string; reason?: string; lat?: number; lng?: number }>('/api/places', { json: { ...place, s: session.current } });
      const p: Pick = r.ok ? { text: label, place: { ...place, s: session.current }, ok: true, label: r.label || '', state: r.state || '', city: r.city || '', lat: r.lat, lng: r.lng, fee: r.fee || 0, days: r.days || '' } : { text: label, place, ok: false, label: r.label, reason: r.reason || 'We don’t deliver there yet.' };
      setPick(p); onPick(p, label);
    } catch (e) {
      const p: Pick = { text: label, place, ok: false, reason: (e as Error).message || 'We couldn’t check that address. Please try again.' };
      setPick(p); onPick(p, label);
    } finally { setChecking(false); session.current = newSession(); }
  };

  // a saved or remembered address: check it again on the server
  useEffect(() => { if (initial?.place && initial.text) choose(initial.place, initial.text); }, [initial?.place?.id, initial?.text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map results: asked for as they type (quickly), remembered, and the last ones stay on screen until new ones arrive
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const q = text.trim();
    if (q.length < 3) { setList([]); setBusy(false); return; }
    const k = (state || '') + '|' + q.toLowerCase();
    const hit = cache.current.get(k);
    if (hit) { setList(hit); setBusy(false); return; }
    let on = true; setBusy(true);
    const t = setTimeout(() => {
      api<{ list: Sug[] }>(`/api/places?q=${encodeURIComponent(q)}&s=${session.current}${state ? '&st=' + encodeURIComponent(state) : ''}`)
        .then(r => { cache.current.set(k, r.list); if (on) { setList(r.list); setHi(-1); } })
        .catch(() => { /* keep what's showing */ })
        .finally(() => on && setBusy(false));
    }, 140);
    return () => { on = false; clearTimeout(t); };
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Areas we know show the instant they type, above the map results
  const local: Sug[] = typing && !pick ? matchLocal(text, state).map(p => ({ id: 'o:area:' + p.name, main: p.name, secondary: p.sub, lat: p.lat, lng: p.lng, local: true })) : [];
  const seen = new Set(local.map(s => s.main.toLowerCase()));
  const shown = local.concat(list.filter(s => !seen.has(s.main.toLowerCase()))).slice(0, 8);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const key = (e: React.KeyboardEvent) => {
    if (!open || !shown.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(shown.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); const s = shown[hi]; choose({ id: s.id, lat: s.lat, lng: s.lng }, lbl(s)); }
    else if (e.key === 'Escape') setOpen(false);
  };
  const google = shown.some(s => s.id.startsWith('g:'));
  const bad = invalid || (pick && !pick.ok);

  return (
    <div ref={box} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className={boxLabel ? `bx${bad ? ' bad' : ''}` : undefined} style={boxLabel ? undefined : { position: 'relative' }}>
        <input id={id} type="text" role="combobox" aria-expanded={open && shown.length > 0} aria-controls={listId} aria-autocomplete="list" autoComplete="off" spellCheck={false}
          value={text} placeholder={boxLabel ? ' ' : placeholder || 'Start typing your address, e.g. 12 Allen Avenue, Ikeja'} aria-label={boxLabel}
          onChange={e => { setText(e.target.value); setTyping(true); setOpen(true); setHi(-1); if (pick) setPick(null); onPick(null, e.target.value); }}
          onFocus={() => shown.length && setOpen(true)} onKeyDown={key} aria-invalid={!!bad}
          style={boxLabel ? { paddingRight: 44 } : { ...field, paddingRight: 40, borderColor: bad ? '#B8402B' : pick?.ok ? '#2E7D4F' : '#DCD6CA' }} />
        {boxLabel && <span className="bx-l" aria-hidden="true">{boxLabel}</span>}
        {((busy && !shown.length) || checking) && <span aria-hidden="true" style={{ position: 'absolute', right: 14, top: boxLabel ? 19 : 16, width: 18, height: 18, borderRadius: '50%', border: '2px solid #E6E0D2', borderTopColor: '#0B3A23', animation: 'spin .8s linear infinite' }} />}
      </div>
      {open && shown.length > 0 && (
        <div id={listId} role="listbox" className="drop-in" style={{ position: 'absolute', left: 0, right: 0, top: boxLabel ? 62 : 54, zIndex: 40, background: '#FFFFFF', borderRadius: 6, border: '1px solid #ECE8DF', boxShadow: '0 20px 50px rgba(17,32,23,.16)', padding: 6, maxHeight: 340, overflowY: 'auto' }}>
          {shown.map((s, i) => (
            <button key={s.id + i} type="button" role="option" aria-selected={hi === i} className="ub drop-row" onMouseDown={e => e.preventDefault()} onClick={() => choose({ id: s.id, lat: s.lat, lng: s.lng }, lbl(s))}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 10px', borderRadius: 4, background: hi === i ? '#F6F2E9' : 'transparent' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A5F1C" strokeWidth="2" style={{ flex: 'none', marginTop: 2 }} aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>
              <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}><span style={{ fontSize: 14, fontWeight: 500, color: '#1F2A23' }}>{s.main}</span>{s.secondary && <span style={{ fontSize: 12.5, color: '#4E5A53' }}>{s.secondary}</span>}</span>
            </button>
          ))}
          <div style={{ padding: '6px 10px 2px', fontSize: 11, color: '#66736B', textAlign: 'right' }}>{google ? 'Powered by Google' : '© OpenStreetMap'}</div>
        </div>
      )}
      {open && !busy && text.trim().length >= 3 && shown.length === 0 && !pick && (
        <p style={{ margin: 0, fontSize: 13, color: '#4E5A53' }}>No match yet. Try your street and area, like “Allen Avenue, Ikeja”.</p>
      )}
      {checking && <p role="status" style={{ margin: 0, fontSize: 13.5, color: '#4E5A53' }}>Checking delivery to this address…</p>}
      {!checking && pick && (pick.ok
        ? <>
          <p role="status" className="fade" style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#1E6B43' }}>✓ We deliver here{pick.label ? <> · <strong style={{ fontWeight: 600 }}>{pick.label}</strong></> : null}{showFee ? <> · delivery {naira(pick.fee)}, usually {pick.days}</> : null}</p>
          {area && boxLabel && <p style={{ margin: 0, fontSize: 13, color: '#4E5A53' }}>Add your street and house number in the next box, so the rider finds you.</p>}
        </>
        : <p role="alert" className="shake" style={{ margin: 0, fontSize: 14, lineHeight: 1.55, fontWeight: 600, color: '#B3261E' }}>{pick.reason}</p>)}
    </div>
  );
}
