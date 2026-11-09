import { db, must } from './db';

export type Size = { label: string; price: number | null; sale: number | null; kg: number; na: boolean };
export type Product = { id: string; name: string; cat: string; items: string[] | null; sizes: Size[]; status: string; stock: number; low: number; hidden: boolean; img: string | null; short: string | null; sort: number };
export type Zone = { id: string; label: string; km: number; fee: number; day: string | null; state: string | null; city: string | null; region: string | null; days: string | null; sort: number };
export type Fees = { min: number; lagosKg: number; interKg: number; van: number; same: number; express: number; eco: number; regions: Record<string, { fee: number; days: string }> };

export async function getProducts(includeHidden = false): Promise<Product[]> {
  let q = db().from('products').select('*').order('sort');
  if (!includeHidden) q = q.eq('hidden', false);
  return must(await q) as Product[];
}
/** Delivery zones. Lagos areas always; outside Lagos only the states switched on in Admin > Delivery (Oyo to start). */
export const DEFAULT_OPEN_STATES = ['st:Oyo'];
export async function getZones(all = false): Promise<Zone[]> {
  const [zones, open] = await Promise.all([
    db().from('zones').select('*').order('sort').then(r => must(r) as Zone[]),
    all ? Promise.resolve(null) : getSetting<string[]>('open_states', DEFAULT_OPEN_STATES),
  ]);
  return open ? zones.filter(z => !z.state || open.includes(z.id)) : zones;
}
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = await db().from('settings').select('value').eq('key', key).maybeSingle();
  return (r.data?.value as T) ?? fallback;
}
export async function setSetting(key: string, value: unknown) {
  must(await db().from('settings').upsert({ key, value }));
}
export const DEFAULT_FEES: Fees = { min: 10000, lagosKg: 50, interKg: 400, van: 3000, same: 2500, express: 3500, eco: 1000, regions: {} };

export const SWAP_CEREAL = ['Cornflakes','Coco Pops','Frosties','Moon and Star','Golden Morn','Fruit and Fiber','Oat','Custard','Milo','Choco Malt','Lactorich milk','Dano milk','Peak milk','Sugar'];
export const SWAP_FOOD = ['Rice','Spaghetti','Noodles','Garri','Beans','Semo','Veg oil','Palm oil','Sugar','Tin tomatoes','Seasoning cubes','Junks/beverages'];
