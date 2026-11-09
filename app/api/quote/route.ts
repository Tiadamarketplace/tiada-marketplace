import { z } from 'zod';
import { handle, ok, limit, clientIp } from '@/lib/http';
import { CartItem, priceCart } from '@/lib/pricing';

/** Prices the cart for the order summary (and checks a discount code) without making an order. */
const Body = z.object({ items: z.array(CartItem).min(1).max(40), zone_id: z.string().max(40).optional().nullable(), speed: z.enum(['same', 'next', 'eco']).default('next'), voucher: z.string().trim().max(20).optional().nullable(), email: z.string().trim().max(120).optional().nullable() });
export const POST = handle(async (req: Request) => {
  limit('quote:' + clientIp(req), 120, 10 * 60000);
  const b = Body.parse(await req.json());
  const p = await priceCart(b.items, { zoneId: b.zone_id, speed: b.speed, voucher: b.voucher, email: b.email, quote: true });
  return ok({ subtotal: p.subtotal, discount: p.discount, voucher: p.voucher, fee: p.fee, total: p.total, kg: p.kg, speed: p.speedLabel, min: p.min, zone: p.zone ? { id: p.zone.id, day: p.zone.day, days: p.zone.days } : null });
});
