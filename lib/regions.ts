import { getSetting } from './catalog';
import { Spot } from './geo';
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
  if (km > cfg.range) return { ok: false, reason: `We don’t reach ${spot.city || 'this part of ' + r} yet. It’s outside our ${r} delivery area for now.` };
  return { ok: true, region: r, fee: feeFor(cfg, km), days: cfg.days, km };
}
