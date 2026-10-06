import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, limit, clientIp, HttpError } from '@/lib/http';
import { db, must } from '@/lib/db';
import { CartItem, priceCart } from '@/lib/pricing';
import { createTransferAccount } from '@/lib/paystack';
import { currentCustomer } from '@/lib/customer';

const Body = z.object({
  items: z.array(CartItem).min(1).max(40),
  email: z.string().trim().toLowerCase().email('Enter a valid email so we can send your tracking code.').max(120),
  name: z.string().trim().min(2, 'Add your name.').max(60),
  phone: z.string().trim().transform(s => s.replace(/[\s-]/g, '')).pipe(z.string().regex(/^0[789][01]\d{8}$/, 'Use an 11-digit Nigerian phone number.')),
  address: z.string().trim().min(6, 'Add a house number and street.').max(160),
  landmark: z.string().trim().max(120).optional().nullable(),
  zone_id: z.string().max(40),
  speed: z.enum(['same', 'next', 'eco']),
  voucher: z.string().trim().max(20).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
  save_address: z.boolean().optional(),
});
export const POST = handle(async (req: Request) => {
  limit('checkout:' + clientIp(req), 10, 10 * 60000);
  const b = Body.parse(await req.json());
  const priced = await priceCart(b.items, { zoneId: b.zone_id, speed: b.speed, voucher: b.voucher });
  const cust = await currentCustomer();
  const ref = 'TDA_' + crypto.randomBytes(9).toString('hex');
  const order = must(await db().from('orders').insert({
    customer_id: cust?.id || null, email: b.email, name: b.name, phone: b.phone, address: b.address, landmark: b.landmark || null,
    zone_id: priced.zone.id, area_label: priced.zone.state || priced.zone.label.split(',')[0], speed: b.speed, speed_label: priced.speedLabel,
    items: priced.lines, note: b.note || null, subtotal: priced.subtotal, discount: priced.discount, voucher: priced.voucher,
    delivery_fee: priced.fee, total: priced.total, kg: priced.kg, status: 'pending', pay_ref: ref,
  }).select('id,total').single()) as { id: string; total: number };
  let acct;
  try { acct = await createTransferAccount({ email: b.email, amountNaira: order.total, reference: ref, orderId: order.id, minutes: 30 }); }
  catch (e) {
    console.error('transfer account failed', e);
    await db().from('orders').update({ status: 'expired' }).eq('id', order.id);
    throw new HttpError(502, 'We couldn’t create your payment account just now. Please try again in a minute.');
  }
  await db().from('orders').update({ pay_account: acct }).eq('id', order.id);
  if (cust && b.save_address) {
    const have = must(await db().from('addresses').select('street').eq('customer_id', cust.id)) as { street: string }[];
    if (have.length < 5 && !have.some(a => a.street.toLowerCase() === b.address.toLowerCase()))
      await db().from('addresses').insert({ customer_id: cust.id, label: have.length ? 'Saved ' + (have.length + 1) : 'Home', street: b.address, landmark: b.landmark || null, zone_id: priced.zone.id });
  }
  return ok({ order: { id: order.id, total: order.total, subtotal: priced.subtotal, fee: priced.fee, discount: priced.discount, speed: priced.speedLabel }, ref, account: acct });
});
