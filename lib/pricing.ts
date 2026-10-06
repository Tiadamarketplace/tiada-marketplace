import { z } from 'zod';
import { getProducts, getZones, getSetting, DEFAULT_FEES, Fees, SWAP_CEREAL, SWAP_FOOD } from './catalog';
import { HttpError } from './http';

export const CartItem = z.object({
  pid: z.string().max(40),
  size: z.string().max(20),
  qty: z.number().int().min(1).max(50),
  swaps: z.array(z.object({ from: z.string().max(40), to: z.string().max(40) })).max(10).optional(),
});
export type CartItemT = z.infer<typeof CartItem>;

export type PricedLine = { pid: string; name: string; size: string; qty: number; price: number; was: number | null; kg: number; swaps: { from: string; to: string }[]; img: string | null };

/** Work out the order from scratch on the server. Prices from the browser are never trusted. */
export async function priceCart(items: CartItemT[], opts: { zoneId: string; speed: string; voucher?: string | null }) {
  if (!items.length) throw new HttpError(400, 'Your basket is empty.');
  const [products, zones, fees, vouchers] = await Promise.all([
    getProducts(), getZones(), getSetting<Fees>('fees', DEFAULT_FEES), getSetting<Record<string, number>>('vouchers', { TIADACARE: 500 }),
  ]);
  const lines: PricedLine[] = [];
  for (const it of items) {
    const p = products.find(x => x.id === it.pid);
    if (!p) throw new HttpError(400, 'One of your items is no longer available. Please refresh your basket.');
    if (p.status === 'out' || p.status === 'na') throw new HttpError(400, `${p.name} is sold out right now. Please remove it from your basket.`);
    const s = p.sizes.find(x => x.label === it.size && !x.na);
    if (!s || s.price == null) throw new HttpError(400, `${p.name} isn’t sold in ${it.size}.`);
    let swaps: { from: string; to: string }[] = [];
    if (p.items && it.swaps?.length) {
      const allowed = p.cat === 'ccombo' ? SWAP_CEREAL : SWAP_FOOD;
      swaps = it.swaps.filter(w => p.items!.includes(w.from) && allowed.includes(w.to));
    }
    const now = s.sale && s.sale < s.price ? s.sale : s.price;
    lines.push({ pid: p.id, name: p.name, size: s.label, qty: it.qty, price: now, was: now < s.price ? s.price : null, kg: s.kg, swaps, img: p.img });
  }
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const kg = Math.round(lines.reduce((a, l) => a + l.kg * l.qty, 0) * 100) / 100;
  const code = (opts.voucher || '').trim().toUpperCase();
  const discount = code && vouchers[code] ? Math.min(vouchers[code], subtotal) : 0;
  if (subtotal < fees.min) throw new HttpError(400, `The minimum order for delivery is ₦${fees.min.toLocaleString()}.`);

  const zone = zones.find(z => z.id === opts.zoneId);
  if (!zone) throw new HttpError(400, 'Choose your delivery area or state.');
  let fee: number, speedLabel: string;
  if (zone.state) {
    const extra = kg > 5 ? Math.ceil(kg - 5) * fees.interKg : 0;
    const rush = opts.speed === 'same' ? fees.express : 0;
    fee = zone.fee + extra + rush;
    speedLabel = opts.speed === 'same' ? 'Express courier' : 'Standard courier';
  } else {
    const weight = kg > 5 ? Math.round((kg - 5) * fees.lagosKg) : 0;
    const van = kg > 20 ? fees.van : 0;
    if (opts.speed === 'eco') { fee = fees.eco + weight + van; speedLabel = 'Economy delivery (grouped)'; }
    else { fee = zone.fee + weight + van + (opts.speed === 'same' ? fees.same : 0); speedLabel = opts.speed === 'same' ? 'Priority delivery' : 'Standard delivery'; }
  }
  const total = subtotal - discount + fee;
  return { lines, subtotal, discount, voucher: discount ? code : null, fee, total, kg, zone, speedLabel };
}
