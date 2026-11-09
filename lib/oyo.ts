/**
 * Oyo State deliveries, priced by distance from Tiada's Oyo spot.
 * The spot (hub) lives only in the settings table and is never sent to the browser:
 * customers only ever see the finished fee for their area.
 */
export type OyoConfig = { hub: { lat: number; lng: number } | null; start: number; perKm: number; max?: number | null; off: string[]; fees: Record<string, number> };
/** The Oyo branch is in Iseyin. Until the exact pin is saved in Admin > Delivery, fees are measured from the town centre. */
export const ISEYIN_CENTRE = { lat: 7.967, lng: 3.6 };
// Kept low on purpose: small start fee, a little per km, and a ceiling so far towns stay affordable.
export const DEFAULT_OYO: OyoConfig = { hub: null, start: 1000, perKm: 50, max: 5000, off: [], fees: {} };

// [id, name, lat, lng, group]: approximate centres. Road distance is taken as 1.3 × the straight line.
export type OyoGroup = 'Iseyin and nearby' | 'Ibadan' | 'Other towns';
export const OYO_GROUPS: OyoGroup[] = ['Iseyin and nearby', 'Ibadan', 'Other towns'];
export const OYO_DAYS: Record<OyoGroup, string> = { 'Iseyin and nearby': 'same or next day', Ibadan: '1–2 days', 'Other towns': '1–3 days' };
export const OYO_AREAS: [string, string, number, number, OyoGroup][] = [
  ['iseyin', 'Iseyin town', 7.967, 3.6, 'Iseyin and nearby'], ['okeho', 'Okeho', 8.033, 3.35, 'Iseyin and nearby'], ['ado-awaye', 'Ado-Awaye', 7.817, 3.433, 'Iseyin and nearby'],
  ['agbowo', 'Agbowo', 7.435, 3.91, 'Ibadan'], ['agodi', 'Agodi GRA', 7.409, 3.915, 'Ibadan'], ['akobo', 'Akobo', 7.438, 3.949, 'Ibadan'],
  ['alalubosa', 'Alalubosa GRA', 7.394, 3.874, 'Ibadan'], ['apata', 'Apata', 7.374, 3.832, 'Ibadan'], ['apete', 'Apete', 7.448, 3.873, 'Ibadan'],
  ['basorun', 'Basorun', 7.423, 3.938, 'Ibadan'], ['beere', 'Beere and Mapo', 7.383, 3.9, 'Ibadan'], ['bodija', 'Bodija', 7.429, 3.911, 'Ibadan'],
  ['challenge', 'Challenge', 7.351, 3.878, 'Ibadan'], ['dugbe', 'Dugbe and Adamasingba', 7.388, 3.885, 'Ibadan'], ['elebu', 'Elebu and Oke-Ado', 7.346, 3.852, 'Ibadan'],
  ['eleyele', 'Eleyele', 7.415, 3.864, 'Ibadan'], ['felele', 'Felele', 7.342, 3.892, 'Ibadan'], ['gate', 'Gate and Oja Oba', 7.39, 3.91, 'Ibadan'],
  ['idiape', 'Idi-Ape', 7.415, 3.924, 'Ibadan'], ['iwo-road', 'Iwo Road', 7.406, 3.938, 'Ibadan'], ['jericho', 'Jericho', 7.397, 3.867, 'Ibadan'],
  ['mokola', 'Mokola', 7.406, 3.893, 'Ibadan'], ['molete', 'Molete', 7.368, 3.897, 'Ibadan'], ['monatan', 'Monatan', 7.418, 3.954, 'Ibadan'],
  ['moniya', 'Moniya and Akinyele', 7.521, 3.915, 'Ibadan'], ['odo-ona', 'Odo-Ona', 7.353, 3.842, 'Ibadan'], ['ojoo', 'Ojoo', 7.468, 3.907, 'Ibadan'],
  ['olodo', 'Olodo', 7.428, 3.973, 'Ibadan'], ['oluyole', 'Oluyole Estate', 7.366, 3.865, 'Ibadan'], ['ring-road', 'Ring Road', 7.36, 3.87, 'Ibadan'],
  ['samonda', 'Samonda and UI', 7.44, 3.899, 'Ibadan'], ['sango', 'Sango', 7.421, 3.897, 'Ibadan'],
  ['ido', 'Ido', 7.51, 3.72, 'Other towns'], ['fiditi', 'Fiditi', 7.717, 3.917, 'Other towns'], ['oyo-town', 'Oyo town', 7.85, 3.933, 'Other towns'],
  ['eruwa', 'Eruwa', 7.533, 3.417, 'Other towns'], ['igbo-ora', 'Igbo-Ora', 7.433, 3.283, 'Other towns'],
  ['ogbomoso', 'Ogbomoso', 8.134, 4.24, 'Other towns'], ['saki', 'Saki', 8.667, 3.383, 'Other towns'], ['igboho', 'Igboho', 8.833, 3.767, 'Other towns'],
];

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3;
}

export type OyoArea = { id: string; name: string; group: OyoGroup; km: number | null; fee: number; auto: number; on: boolean };
/** Every area with its fee, measured from the saved pin (or Iseyin town centre until a pin is saved). */
export function oyoAreas(cfg: OyoConfig, fallback: number): OyoArea[] {
  return [...OYO_AREAS].sort((a, b) => OYO_GROUPS.indexOf(a[4]) - OYO_GROUPS.indexOf(b[4])).map(([id, name, lat, lng, group]) => {
    void fallback;
    const d = Math.round(km(cfg.hub || ISEYIN_CENTRE, { lat, lng }) * 10) / 10;
    const raw = Math.ceil((cfg.start + d * cfg.perKm) / 100) * 100;
    const auto = cfg.max ? Math.min(raw, cfg.max) : raw;
    const fee = cfg.fees[id] ?? auto;
    return { id: 'oyo:' + id, name, group, km: d, fee, auto, on: !cfg.off.includes(id) };
  });
}

/** Reads "7.4290, 3.9110" or a Google Maps link and returns the spot, or null. */
export function parseSpot(s: string, b: [number, number, number, number] = [6.8, 9.3, 2.6, 4.7]): { lat: number; lng: number } | null {
  const t = decodeURIComponent(s || '');
  const m = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(t) || /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(t) || /(?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(t) || /(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/.exec(t);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  // must be inside the state's box (Oyo by default)
  return lat > b[0] && lat < b[1] && lng > b[2] && lng < b[3] ? { lat, lng } : null;
}
