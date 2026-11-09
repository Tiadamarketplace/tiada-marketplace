import { getZones, getSetting, Zone } from './catalog';
import { DEFAULT_OYO, OyoConfig, oyoAreas } from './oyo';

export type ShopZone = Zone & { area?: string };
/**
 * The places customers can choose at checkout: Lagos areas, then open states.
 * Oyo is split into its areas ("oyo:bodija"), each with a fee worked out from the distance to Tiada's Oyo spot.
 * Orders still store the Oyo state row (st:Oyo) as their zone; the area name goes in the order's area label.
 */
export async function deliveryZones(): Promise<ShopZone[]> {
  const [zones, cfg] = await Promise.all([getZones(), getSetting<OyoConfig>('oyo', DEFAULT_OYO)]);
  const out: ShopZone[] = [];
  for (const z of zones) {
    if (z.id !== 'st:Oyo') { out.push(z); continue; }
    for (const a of oyoAreas({ ...DEFAULT_OYO, ...cfg }, z.fee)) if (a.on) out.push({ ...z, id: a.id, label: a.name, fee: a.fee, city: a.group, days: a.group === 'Ibadan' ? '1–2 days' : '2–3 days', area: a.name });
  }
  return out;
}
