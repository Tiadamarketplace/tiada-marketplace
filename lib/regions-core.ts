/**
 * Delivery fees by distance, one set of rules per state we deliver to. Safe to use in the browser (Admin preview).
 * fee = start + km × perKm, rounded up to ₦100, never more than max. Beyond `range` km we don't deliver yet.
 */
export type RegionCfg = { hub: { lat: number; lng: number } | null; start: number; perKm: number; max: number; range: number; days: string };
export type RegionName = 'Lagos' | 'Oyo';

export const CENTRE: Record<RegionName, { lat: number; lng: number }> = { Lagos: { lat: 6.6018, lng: 3.3515 }, Oyo: { lat: 7.967, lng: 3.6 } };
// kept low on purpose: a small start fee, a little per km, and a low ceiling
export const DEFAULT_REGION: Record<RegionName, RegionCfg> = {
  Lagos: { hub: null, start: 700, perKm: 35, max: 2500, range: 80, days: 'next day' },
  Oyo: { hub: null, start: 800, perKm: 30, max: 3500, range: 260, days: '1–3 days' },
};

export function feeFor(cfg: RegionCfg, km: number) {
  const raw = Math.ceil((cfg.start + km * cfg.perKm) / 100) * 100;
  return cfg.max ? Math.min(raw, cfg.max) : raw;
}
/** Road distance in km, taken as 1.3 × the straight line. */
export function roadKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3;
}
/** Merge saved settings over the defaults, ignoring anything broken. */
export function cleanRegion(r: RegionName, s: Partial<RegionCfg> | null | undefined): RegionCfg {
  const d = DEFAULT_REGION[r]; s = s || {};
  const n = (v: unknown, f: number) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : f);
  return { hub: s.hub && typeof s.hub.lat === 'number' ? s.hub : null, start: n(s.start, d.start), perKm: n(s.perKm, d.perKm), max: n(s.max, d.max), range: n(s.range, d.range) || d.range, days: (typeof s.days === 'string' && s.days.trim()) || d.days };
}
// a few well-known places, to show Admin what customers will pay
export const SAMPLES: Record<RegionName, [string, number, number][]> = {
  Lagos: [['Ikeja', 6.6018, 3.3515], ['Agege', 6.6156, 3.3209], ['Yaba', 6.5095, 3.3711], ['Surulere', 6.4969, 3.3481], ['Lagos Island', 6.4549, 3.3947], ['Lekki Phase 1', 6.4478, 3.4723], ['Ajah', 6.4682, 3.5852], ['Ikorodu', 6.6194, 3.5105], ['Festac', 6.4667, 3.2833], ['Badagry', 6.4153, 2.8813], ['Epe', 6.5841, 3.9834]],
  Oyo: [['Iseyin', 7.967, 3.6], ['Okeho', 8.033, 3.35], ['Ado-Awaye', 7.817, 3.433], ['Oyo town', 7.85, 3.933], ['Ibadan, Bodija', 7.429, 3.911], ['Ibadan, Challenge', 7.351, 3.878], ['Eruwa', 7.533, 3.417], ['Ogbomoso', 8.134, 4.24], ['Saki', 8.667, 3.383], ['Igboho', 8.833, 3.767]],
};
