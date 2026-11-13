import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, limit, clientIp, HttpError } from '@/lib/http';
import { db, must } from '@/lib/db';
import { CartItem, Place, Typed, priceCart } from '@/lib/pricing';
import { initialize } from '@/lib/paystack';
import { currentCustomer } from '@/lib/customer';
import { env } from '@/lib/env';
import { saveAddress } from '@/lib/customer';

const Body = z.object({
  items: z.array(CartItem).min(1).max(40),
  email: z.string().trim().toLowerCase().email('Enter a valid email so we can send your receipt.').max(120),
  name: z.string().trim().min(2, 'Add your full name.').max(60),
  phone: z.string().trim().transform(s => s.replace(/[\s-]/g, '').replace(/^\+?234/, '0')).pipe(z.string().regex(/^0[789][01]\d{8}$/, 'Use an 11-digit Nigerian phone number, like 0803 000 0000.')),
  address: z.string().trim().min(6, 'Add a house number and street.').max(240),
  landmark: z.string().trim().max(120).optional().nullable(),
  place: Place.optional().nullable(),
  typed: Typed.optional().nullable(),
  speed: z.enum(['same', 'next', 'eco']),
  voucher: z.string().trim().max(20).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
  save_address: z.boolean().optional(),
});
/** Make a pending order at server prices, then open a Paystack payment for exactly that total. */
export const POST = handle(async (req: Request) => {
  limit('checkout:' + clientIp(req), 12, 10 * 60000);
  const b = Body.parse(await req.json());
  const priced = await priceCart(b.items, { place: b.place, typed: b.place ? null : (b.typed || { text: b.address, state: '' }), speed: b.speed, voucher: b.voucher, email: b.email });
  const cust = await currentCustomer();
  const ref = 'TDA_' + crypto.randomBytes(9).toString('hex');
  const row = {
    customer_id: cust?.id || null, email: b.email, name: b.name, phone: b.phone, address: b.address, landmark: b.landmark || null,
    zone_id: priced.zoneId, area_label: priced.areaLabel, speed: b.speed === 'same' ? 'same' : 'next', speed_label: priced.speedLabel,
    items: priced.lines, note: b.note || null, subtotal: priced.subtotal, discount: priced.discount, voucher: priced.voucher,
    delivery_fee: priced.fee, total: priced.total, kg: priced.kg, status: 'pending', pay_ref: ref, spot: priced.spot,
  };
  let ins = await db().from('orders').insert(row).select('id,total').single();
  // the map spot needs the 2026-11-address.sql update; until it's run, save the order without it
  if (ins.error && /spot/.test(ins.error.message)) { const { spot, ...rest } = row; void spot; ins = await db().from('orders').insert(rest).select('id,total').single(); }
  const order = must(ins) as { id: string; total: number };
  let pay;
  try { pay = await initialize({ email: b.email, amountNaira: order.total, reference: ref, orderId: order.id, callbackUrl: `${env.siteUrl}/order/${order.id}?ref=${ref}` }); }
  catch (e) {
    console.error('paystack initialize failed', e);
    await db().from('orders').update({ status: 'expired' }).eq('id', order.id);
    throw new HttpError(502, 'We couldn’t reach Paystack just now. Nothing was charged. Please try again in a minute.');
  }
  if (cust && (!cust.name || !cust.phone)) await db().from('customers').update({ name: cust.name || b.name, phone: cust.phone || b.phone }).eq('id', cust.id);
  if (cust && b.save_address) {
    const have = must(await db().from('addresses').select('street').eq('customer_id', cust.id)) as { street: string }[];
    if (have.length < 5 && !have.some(a => a.street.toLowerCase() === b.address.toLowerCase()))
      await saveAddress({ customer_id: cust.id, label: have.length ? 'Saved ' + (have.length + 1) : 'Home', street: b.address, landmark: b.landmark || null, zone_id: priced.zoneId, spot: priced.spot });
  }
  return ok({ order: { id: order.id, total: order.total }, ref, access_code: pay.access_code, authorization_url: pay.authorization_url });
});
