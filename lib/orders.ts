import { db, must } from './db';
import { notifyOrder, ownerNewOrder, Order } from './notify';
import { countVoucherUse } from './vouchers';

/** Called by the webhook and by "I've made the payment". Safe to call twice. */
export async function markPaid(orderId: string, amountKobo: number, paidAt?: string) {
  const o = must(await db().from('orders').select('*').eq('id', orderId).maybeSingle()) as Order | null;
  if (!o) return { ok: false, reason: 'not found' };
  if (o.status !== 'pending' && o.status !== 'expired') return { ok: true, already: true };
  if (amountKobo < o.total * 100) return { ok: false, reason: 'amount too low' };
  const upd = must(await db().from('orders').update({ status: 'new', paid_at: paidAt || new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', orderId).in('status', ['pending', 'expired']).select('*')) as Order[];
  if (!upd.length) return { ok: true, already: true };
  const paid = upd[0];
  await countVoucherUse(paid.voucher).catch(e => console.error('voucher count', e));
  await notifyOrder(paid, 'placed');
  await ownerNewOrder(paid).catch(e => console.error('owner order email', e));
  return { ok: true };
}

/** What a customer is allowed to see about an order. */
export function publicOrder(o: Order) {
  const { pay_ref, customer_id, rider, confirm, track_fails, stock_taken, ...rest } = o as Order & Record<string, unknown>;
  void pay_ref; void customer_id; void track_fails; void stock_taken;
  return { ...rest, rider: rider ? { partner: rider.partner, tracking: rider.tracking, driver: rider.driver, phone: rider.phone } : null,
    confirm: confirm ? { how: (confirm as { how?: string }).how, at: (confirm as { at?: string }).at } : null };
}
