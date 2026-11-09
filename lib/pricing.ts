import { z } from 'zod';
import { deliveryZones } from './delivery';
import { getProducts, getSetting, DEFAULT_FEES, Fees, SWAP_CEREAL, SWAP_FOOD } from './catalog';
import { HttpError } from './http';
import { applyVoucher } from './vouchers';
import { photoFor } from './photos';

export const CartItem = z.object({
  pid: z.string().max(40),
  size: z.string().max(20),
  qty: z.number().int().min(1).max(50),
  swaps: z.array(z.object({ from: z.string().max(40), to: z.string().max(40) })).max(10).optional(),
});
export type CartItemT = z.infer<typeof CartItem>;

export type PricedLine = { pid: string; name: string; size: string; qty: number; price: number; was: number | null; kg: number; swaps: { from: string; to: string }[]; img: string | null };

/** Work out the order from scratch on the server. Prices from the browser are never trusted. */
export async function priceCart(items: CartItemT[], opts: { zoneId?: string | null; speed: string; voucher?: string | null; email?: string | null; quote?: boolean }) {
  if (!items.length) throw new HttpError(400, 'Your basket is empty.');
  const [products, zones, fees] = await Promise.all([getProducts(), deliveryZones(), getSetting<Fees>('fees', DEFAULT_FEES)]);
  const lines: PricedLine[] = [];
  for (const it of items) {
    const p = products.find(x => x.id === it.pid);
    if (!p) throw new HttpError(400, 'One of your items is no longer available. Please refresh your basket.');
    if (p.status === 'out' || p.status === 'na') throw new HttpError(400, `${p.name} is sold out right now. Please remove it from your basket.`);
    const s = p.sizes.find(x => x.label === it.size && !x.na);
    if (!s || s.price == null) throw new HttpError(400, `${p.name} isn’t sold in ${it.size}.`);
    const left = (s as { stock?: number | null }).stock;
    const label = it.size === 'Package' ? p.name : `${p.name} ${it.size}`;
    if (left != null && left <= 0) throw new HttpError(409, `${label} has just sold out. Please remove it from your cart.`);
    if (left != null && it.qty > left) throw new HttpError(409, `Only ${left} ${label} left. Please lower the quantity in your cart.`);
    let swaps: { from: string; to: string }[] = [];
    if (p.items && it.swaps?.length) {
      const allowed = p.cat === 'ccombo' ? SWAP_CEREAL : SWAP_FOOD;
      swaps = it.swaps.filter(w => p.items!.includes(w.from) && allowed.includes(w.to));
    }
    const now = s.sale && s.sale < s.price ? s.sale : s.price;
    lines.push({ pid: p.id, name: p.name, size: s.label, qty: it.qty, price: now, was: now < s.price ? s.price : null, kg: s.kg, swaps, img: photoFor(p.id, p.img, p.cat) });
  }
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const kg = Math.round(lines.reduce((a, l) => a + l.kg * l.qty, 0) * 100) / 100;
  const v = opts.voucher?.trim() ? await applyVoucher(opts.voucher, subtotal, opts.email) : null;
  const discount = v?.discount || 0;
  if (!opts.quote && subtotal < fees.min) throw new HttpError(400, `The minimum order for delivery is ₦${fees.min.toLocaleString()}. Add ₦${(fees.min - subtotal).toLocaleString()} more.`);

  const zone = zones.find(z => z.id === opts.zoneId);
  if (!zone) {
    if (opts.quote) return { lines, subtotal, discount, voucher: v?.code || null, fee: null, total: subtotal - discount, kg, zone: null, areaLabel: null, speedLabel: null, min: fees.min };
    throw new HttpError(400, 'Choose your delivery area. We deliver in Lagos and the states shown at checkout.');
  }
  let fee: number, speedLabel: string;
  if (zone.state && !zone.area) {
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
  // an Oyo area is stored on the order as the Oyo state, with the area as the label
  const areaLabel = zone.area ? `${zone.area}, Oyo` : zone.state || zone.label.split(',')[0];
  return { lines, subtotal, discount, voucher: v?.code || null, fee, total, kg, zone: zone.area ? { ...zone, id: 'st:Oyo' } : zone, areaLabel, speedLabel, min: fees.min };
}
