/**
 * Address search for checkout. Runs on the server only, so the map key is never sent to the browser.
 * Google Places is used when GOOGLE_MAPS_KEY is set in Vercel; otherwise the free OpenStreetMap search (Photon).
 */
export type Suggestion = { id: string; main: string; secondary: string; lat?: number; lng?: number };
/** A place the customer picked: where it is, which state, and a short name for receipts. */
export type Spot = { lat: number; lng: number; state: string; city: string; label: string; address: string; place?: string; /** typed by hand: the pin is only roughly right */ approx?: boolean };

const GKEY = () => process.env.GOOGLE_MAPS_KEY || '';
const UA = 'TiadaMarketplace/1.0 (tiadamarketplace.com)';
// Nigeria, so suggestions stay local; the bias point is between Lagos and Ibadan
const NG_BOX = '2.6,4.2,14.7,13.9';
const BIAS = { lat: 7.0, lng: 3.6 };

/** "Lagos State" → "Lagos", "Federal Capital Territory" stays as it is. */
export function stateName(s: string | undefined | null) {
  return (s || '').replace(/\s+state$/i, '').trim();
}

const cache = new Map<string, { at: number; v: unknown }>();
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.v as T;
  const v = await fn();
  if (cache.size > 2000) cache.clear();
  cache.set(key, { at: Date.now(), v });
  return v;
}

/** State centres, to point suggestions at the state the customer chose. */
const STATE_BIAS: Record<string, { lat: number; lng: number }> = { Lagos: { lat: 6.55, lng: 3.4 }, Oyo: { lat: 7.75, lng: 3.75 } };
export async function suggest(q: string, session: string, state?: string): Promise<Suggestion[]> {
  let t = q.trim().slice(0, 120);
  if (t.length < 3) return [];
  // "Allen Avenue" + chosen state Lagos → search "Allen Avenue, Lagos", unless they already typed the state
  if (state && !t.toLowerCase().includes(state.toLowerCase())) t = `${t}, ${state}`;
  const bias = (state && STATE_BIAS[state]) || BIAS;
  return cached(`s:${GKEY() ? 'g' : 'o'}:${t.toLowerCase()}`, () => (GKEY() ? googleSuggest(t, session, bias) : osmSuggest(t, bias)));
}

/** Turn a picked suggestion into a Spot. The state always comes from the map service, never from the browser. */
export async function resolve(p: { id: string; lat?: number | null; lng?: number | null; session?: string | null }): Promise<Spot | null> {
  if (p.id.startsWith('g:') && GKEY()) return cached('r:' + p.id, () => googleDetails(p.id.slice(2), p.session || ''));
  if (typeof p.lat === 'number' && typeof p.lng === 'number') {
    const lat = Math.round(p.lat * 1e5) / 1e5, lng = Math.round(p.lng * 1e5) / 1e5;
    return cached(`r:o:${lat},${lng}`, () => osmReverse(lat, lng, p.id));
  }
  return null;
}

// ---------- Google Places (New) ----------
async function googleSuggest(q: string, session: string, bias = BIAS): Promise<Suggestion[]> {
  const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GKEY() },
    body: JSON.stringify({ input: q, includedRegionCodes: ['ng'], sessionToken: session || undefined, locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 50000 } } }),
  });
  if (!r.ok) { console.error('google autocomplete', r.status, (await r.text()).slice(0, 300)); return osmSuggest(q, bias); }
  const j = await r.json() as { suggestions?: { placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[] };
  return (j.suggestions || []).flatMap(s => {
    const p = s.placePrediction; if (!p) return [];
    return [{ id: 'g:' + p.placeId, main: p.structuredFormat?.mainText?.text || p.text?.text || '', secondary: p.structuredFormat?.secondaryText?.text || '' }];
  }).slice(0, 6);
}
async function googleDetails(placeId: string, session: string): Promise<Spot | null> {
  const u = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${session ? `?sessionToken=${encodeURIComponent(session)}` : ''}`;
  const r = await fetch(u, { headers: { 'X-Goog-Api-Key': GKEY(), 'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents' } });
  if (!r.ok) { console.error('google details', r.status, (await r.text()).slice(0, 300)); return null; }
  const j = await r.json() as { formattedAddress?: string; location?: { latitude: number; longitude: number }; addressComponents?: { longText: string; types: string[] }[] };
  if (!j.location) return null;
  const part = (...types: string[]) => (j.addressComponents || []).find(c => types.some(t => c.types.includes(t)))?.longText || '';
  const state = stateName(part('administrative_area_level_1'));
  const city = part('locality', 'administrative_area_level_2', 'postal_town');
  const area = part('sublocality_level_1', 'sublocality', 'neighborhood');
  return { lat: j.location.latitude, lng: j.location.longitude, state, city, label: [area, city, state].filter((x, i, a) => x && a.indexOf(x) === i).join(', '), address: j.formattedAddress || '', place: 'g:' + placeId };
}

// ---------- OpenStreetMap (Photon), free, no key ----------
type PhotonF = { properties: { osm_type?: string; osm_id?: number; name?: string; housenumber?: string; street?: string; district?: string; locality?: string; city?: string; county?: string; state?: string; countrycode?: string }; geometry: { coordinates: [number, number] } };
const line = (p: PhotonF['properties']) => {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const main = p.name || street || p.district || p.locality || p.city || '';
  const rest = [p.name && street !== main ? street : '', p.district || p.locality, p.city || p.county, p.state].filter((x, i, a) => x && x !== main && a.indexOf(x) === i);
  return { main, secondary: rest.join(', ') };
};
async function osmSuggest(q: string, bias = BIAS): Promise<Suggestion[]> {
  const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=${NG_BOX}&lat=${bias.lat}&lon=${bias.lng}`;
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) { console.error('photon search', r.status); return []; }
  const j = await r.json() as { features?: PhotonF[] };
  const seen = new Set<string>();
  return (j.features || []).filter(f => (f.properties.countrycode || 'NG') === 'NG').flatMap(f => {
    const l = line(f.properties); const k = (l.main + l.secondary).toLowerCase();
    if (!l.main || seen.has(k)) return []; seen.add(k);
    return [{ id: `o:${f.properties.osm_type || ''}${f.properties.osm_id || ''}`, ...l, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }];
  }).slice(0, 6);
}
async function osmReverse(lat: number, lng: number, id: string): Promise<Spot | null> {
  const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`, { headers: { 'User-Agent': UA } });
  if (!r.ok) { console.error('photon reverse', r.status); return null; }
  const j = await r.json() as { features?: PhotonF[] };
  const p = j.features?.[0]?.properties;
  if (!p) return null;
  const state = stateName(p.state);
  const city = p.city || p.county || '';
  const area = p.district || p.locality || '';
  const l = line(p);
  return { lat, lng, state, city, label: [area, city, state].filter((x, i, a) => x && a.indexOf(x) === i).join(', '), address: [l.main, l.secondary].filter(Boolean).join(', '), place: id };
}

export const mapLink = (s: { lat: number; lng: number; approx?: boolean; address?: string }) => `https://www.google.com/maps/search/?api=1&query=${s.approx && s.address ? encodeURIComponent(s.address) : `${s.lat},${s.lng}`}`;
