import { getSetting } from './catalog';
import { Spot, suggest, resolve } from './geo';
import { LOCAL_PLACES } from './places-ng';
import { CENTRE, RegionCfg, RegionName, cleanRegion, feeFor, roadKm } from './regions-core';

export * from './regions-core';

/** The rules in force, for each state that is open. Lagos is always open; Oyo while it's switched on in Admin. */
export async function regions(): Promise<Partial<Record<RegionName, RegionCfg>>> {
  const [lagos, oyo, open] = await Promise.all([
    getSetting<Partial<RegionCfg>>('lagos', {}), getSetting<Partial<RegionCfg>>('oyo', {}), getSetting<string[]>('open_states', ['st:Oyo']),
  ]);
  const out: Partial<Record<RegionName, RegionCfg>> = { Lagos: cleanRegion('Lagos', lagos) };
  if (open.includes('st:Oyo')) out.Oyo = cleanRegion('Oyo', oyo);
  return out;
}

export type SpotQuote = { ok: true; region: RegionName; fee: number; days: string; km: number } | { ok: false; reason: string };
/** Do we deliver to this spot, and for how much? */
export function quoteSpot(spot: Spot, regs: Partial<Record<RegionName, RegionCfg>>): SpotQuote {
  const open = Object.keys(regs) as RegionName[];
  const list = open.length > 1 ? `${open.slice(0, -1).join(', ')} and ${open[open.length - 1]} State` : `${open[0]}`;
  const r = open.find(x => x.toLowerCase() === spot.state.toLowerCase());
  if (!r) return { ok: false, reason: `We don’t deliver to ${spot.state ? spot.state + (/state|territory/i.test(spot.state) ? '' : ' State') : 'this area'} yet. Right now we deliver in ${list}.` };
  const cfg = regs[r]!;
  const km = Math.round(roadKm(cfg.hub || CENTRE[r], spot) * 10) / 10;
  return { ok: true, region: r, fee: feeFor(cfg, km), days: cfg.days, km };
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * An address the customer typed themselves (they didn't pick a suggestion). We deliver anywhere in an open state,
 * so the state they chose decides it. For the fee we find roughly where it is: an area name in what they typed,
 * else the map search, else the middle of the state.
 */
export async function typedSpot(text: string, state: string): Promise<Spot | null> {
  const st = (['Lagos', 'Oyo'] as RegionName[]).find(x => x.toLowerCase() === state.trim().toLowerCase());
  if (!st) return null;
  const t = ' ' + norm(text) + ' ';
  const area = LOCAL_PLACES.filter(p => p.state === st && [p.name, ...(p.alt ? p.alt.split(' ') : [])].some(n => n.length >= 3 && t.includes(' ' + norm(n) + ' ')))
    .sort((a, b) => b.name.length - a.name.length)[0];
  const base = { state: st, address: text.trim(), approx: true as const };
  if (area) return { ...base, lat: area.lat, lng: area.lng, city: area.name, label: `${area.name}, ${st}` };
  try {
    const found = await Promise.race([
      (async () => { const list = await suggest(text, 'typed', st); const first = list[0]; return first ? resolve({ id: first.id, lat: first.lat, lng: first.lng }) : null; })(),
      new Promise<null>(res => setTimeout(() => res(null), 3000)),
    ]);
    if (found && found.state.toLowerCase() === st.toLowerCase()) return { ...base, lat: found.lat, lng: found.lng, city: found.city, label: found.label || st };
  } catch { /* map search down: use the middle of the state */ }
  return { ...base, ...CENTRE[st], city: '', label: st };
}
