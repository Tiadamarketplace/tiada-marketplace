import { z } from 'zod';
import { resolve, Spot } from './geo';
import { quoteSpot, regions, typedSpot } from './regions';
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
/** The address the customer picked from the suggestions. The server looks it up again itself. */
export const Place = z.object({ id: z.string().max(300), lat: z.number().min(-90).max(90).optional().nullable(), lng: z.number().min(-180).max(180).optional().nullable(), s: z.string().max(80).optional().nullable() });
export type PlaceT = z.infer<typeof Place>;
/** An address typed by hand (no suggestion picked), with the state they chose. */
export const Typed = z.object({ text: z.string().trim().min(5).max(300), state: z.string().trim().max(30) });

export type PricedLine = { pid: string; name: string; size: string; qty: number; price: number; was: number | null; kg: number; swaps: { from: string; to: string }[]; img: string | null };

/** Work out the order from scratch on the server. Prices from the browser are never trusted. */
export async function priceCart(items: CartItemT[], opts: { place?: PlaceT | null; typed?: z.infer<typeof Typed> | null; speed: string; voucher?: string | null; email?: string | null; quote?: boolean }) {
  if (!items.length) throw new HttpError(400, 'Your basket is empty.');
  const [products, regs, fees] = await Promise.all([getProducts(), regions(), getSetting<Fees>('fees', DEFAULT_FEES)]);
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

  const spot: Spot | null = opts.place ? await resolve({ id: opts.place.id, lat: opts.place.lat, lng: opts.place.lng, session: opts.place.s }) : opts.typed ? await typedSpot(opts.typed.text, opts.typed.state) : null;
  const sq = spot ? quoteSpot(spot, regs) : null;
  const none = { lines, subtotal, discount, voucher: v?.code || null, fee: null, total: subtotal - discount, kg, zoneId: null, spot: null, areaLabel: null, speedLabel: null, days: null, min: fees.min };
  if (!spot || !sq || !sq.ok) {
    const reason = !opts.place && !opts.typed ? 'Type your delivery address.' : !spot && opts.typed ? 'Right now we deliver in Lagos and Oyo State. Choose one of them.' : !spot ? 'We couldn’t find that place. Type your address yourself instead.' : (sq as { reason: string }).reason;
    if (opts.quote) return { ...none, reason };
    throw new HttpError(400, reason);
  }
  const weight = kg > 5 ? Math.round((kg - 5) * fees.lagosKg) : 0;
  const van = kg > 20 ? fees.van : 0;
  const rush = opts.speed === 'same';
  const fee = sq.fee + weight + van + (rush ? fees.same : 0);
  const speedLabel = rush ? 'Priority delivery' : 'Standard delivery';
  const total = subtotal - discount + fee;
  return { lines, subtotal, discount, voucher: v?.code || null, fee, total, kg, zoneId: sq.region === 'Oyo' ? 'st:Oyo' : null, spot: { ...spot, region: sq.region, km: sq.km, days: sq.days }, areaLabel: spot.label || sq.region, speedLabel, days: rush ? 'today or next morning where we can' : sq.days, min: fees.min, reason: null };
}
