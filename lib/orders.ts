import { clearCart } from './carts';
import { randomInt } from 'crypto';
import { db, must } from './db';
import { notifyOrder, ownerNewOrder, Order } from './notify';
import { countVoucherUse } from './vouchers';

/** Called by the webhook and by "I've made the payment". Safe to call twice. */
export async function markPaid(orderId: string, amountKobo: number, paidAt?: string) {
  const o = must(await db().from('orders').select('*').eq('id', orderId).maybeSingle()) as Order | null;
  if (!o) return { ok: false, reason: 'not found' };
  if (o.status !== 'pending' && o.status !== 'expired') return { ok: true, already: true };
  if (amountKobo < o.total * 100) return { ok: false, reason: 'amount too low' };
  const set = { status: 'new', paid_at: paidAt || new Date().toISOString(), updated_at: new Date().toISOString(), drop_code: newDropCode() };
  let res = await db().from('orders').update(set).eq('id', orderId).in('status', ['pending', 'expired']).select('*');
  // drop_code comes with 2026-11-riders.sql; until it's run, mark it paid without one
  if (res.error && /drop_code/.test(res.error.message)) { const { drop_code, ...rest } = set; void drop_code; res = await db().from('orders').update(rest).eq('id', orderId).in('status', ['pending', 'expired']).select('*'); }
  const upd = must(res) as Order[];
  if (!upd.length) return { ok: true, already: true };
  const paid = upd[0];
  await countVoucherUse(paid.voucher).catch(e => console.error('voucher count', e));
  await notifyOrder(paid, 'placed');
  await ownerNewOrder(paid).catch(e => console.error('owner order email', e));
  await clearCart(paid.email).catch(() => {});
  return { ok: true };
}

/** A 4-digit code the customer gives the rider at the door, so a delivery can't be faked. */
export function newDropCode() { return String(randomInt(0, 10000)).padStart(4, '0'); }

/** What a customer is allowed to see about an order. */
export function publicOrder(o: Order) {
  const { pay_ref, customer_id, rider, confirm, track_fails, stock_taken, spot, ...rest } = o as Order & Record<string, unknown>;
  void pay_ref; void customer_id; void track_fails; void stock_taken;
  // never send the map spot (the customer's exact location, and its distance from our pin) to the browser
  return { ...rest, spot: spot ? { days: (spot as { days?: string }).days || null } : null, rider: rider ? { partner: rider.partner, tracking: rider.tracking, driver: rider.driver, phone: rider.phone } : null,
    confirm: confirm ? { how: (confirm as { how?: string }).how, at: (confirm as { at?: string }).at } : null };
}
