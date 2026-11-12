import { z } from 'zod';
import { handle, ok, fail, HttpError } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';
import { notifyOrder, Order } from '@/lib/notify';
import { refund as paystackRefund } from '@/lib/paystack';
import { naira } from '@/lib/email';
import { refreshShop } from '@/lib/refresh';
import { newDropCode } from '@/lib/orders';

export const dynamic = 'force-dynamic';
const txt = (max: number) => z.string().trim().max(max);
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('packed') }),
  z.object({ action: z.literal('route'), partner: txt(60).min(2), tracking: txt(60).min(2, 'Add the booking or tracking number.'), driver: txt(60).optional(), phone: txt(20).optional(), cost: z.number().int().min(0).max(1_000_000).optional(), rider_id: z.string().uuid().optional() }),
  z.object({ action: z.literal('done'), how: txt(80).min(2), note: txt(200).optional() }),
  z.object({ action: z.literal('issue'), reason: txt(120).min(2), note: txt(500).optional(), eta: txt(80).optional() }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('refund'), full: z.boolean(), amount: z.number().int().positive().optional(), reason: txt(120).min(2), note: txt(500).optional() }),
  z.object({ action: z.literal('cancel'), reason: txt(120).min(2), note: txt(500).optional() }),
  z.object({ action: z.literal('note'), note: txt(1000).min(2, 'Write a message.') }),
  z.object({
    action: z.literal('edit'),
    name: txt(80).min(2, 'Add the customer’s name.'), phone: txt(20).min(7, 'Add a phone number.'), email: z.string().trim().toLowerCase().email('Enter a valid email.'),
    address: txt(240).min(6, 'Add the address.'), landmark: txt(120).optional().nullable(), note: txt(500).optional().nullable(),
    delivery_fee: z.number().int().min(0).max(1_000_000),
    items: z.array(z.object({ pid: z.string().max(40).optional().nullable(), name: txt(120).min(1), size: txt(40).min(1), qty: z.number().int().min(1).max(999), price: z.number().int().min(0).max(10_000_000), kg: z.number().min(0).max(500).optional().nullable(), img: z.string().max(500).optional().nullable(), swaps: z.array(z.unknown()).optional().nullable(), was: z.number().optional().nullable() })).min(1, 'An order needs at least one item. To drop everything, cancel the order.').max(60),
  }),
]);
type O = Order & { stock_taken: boolean; customer_id: string | null; updated_at: string; paid?: number | null };

/** Take stock off (or put it back on) the exact size that was ordered. */
async function stock(o: O, dir: -1 | 1) {
  for (const it of o.items as { pid?: string; size?: string; qty: number }[]) {
    if (!it.pid) continue;
    if (it.size) must(await db().rpc('adjust_size_stock', { p_id: it.pid, p_size: it.size, delta: dir * it.qty }));
    else must(await db().rpc('adjust_stock', { p_id: it.pid, delta: dir * it.qty }));
  }
  refreshShop();
}

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = Body.parse(await req.json());
  const me = await requireStaff(req, b.action === 'refund' || b.action === 'cancel' ? 'refund' : 'orders');
  const o = must(await db().from('orders').select('*').eq('id', id).maybeSingle()) as O | null;
  if (!o) return fail('Order not found.', 404);
  if (['pending', 'expired'].includes(o.status)) return fail('This order hasn’t been paid.');
  if (['refunded', 'cancelled'].includes(o.status) && b.action !== 'note') return fail('This order is closed.');
  if (b.action === 'edit' && o.status === 'done') return fail('This order is delivered, so it can’t be changed. Use Refund if something was wrong.');
  const now = new Date().toISOString();
  // claim the order first: if two people act at once, only one gets through, before any stock or money moves
  const claimed = must(await db().from('orders').update({ updated_at: now }).eq('id', o.id).eq('updated_at', o.updated_at).select('id')) as unknown[];
  if (!claimed.length) return fail('Someone else just changed this order. Refresh and try again.', 409);
  const upd: Record<string, unknown> = { updated_at: now };
  let kind: Parameters<typeof notifyOrder>[1] | null = null, data: Record<string, unknown> = {}, log = '';
  const takeStock = async () => { if (!o.stock_taken) { await stock(o, -1); upd.stock_taken = true; } };

  switch (b.action) {
    case 'packed':
      await takeStock(); upd.status = 'packed'; kind = 'packed'; log = `Packed ${o.id} for ${o.name}`; break;
    case 'route':
      await takeStock(); upd.status = 'route';
      if (!o.drop_code) upd.drop_code = newDropCode(); // older orders: make the code now, it goes in the on-the-way email
      if (b.rider_id) {
        // one of our riders: their name and phone go in the customer's email, and the order shows on their rider page
        const rd = (await db().from('riders').select('id,name,phone,active').eq('id', b.rider_id).maybeSingle()).data as { id: string; name: string; phone: string | null; active: boolean } | null;
        if (!rd || !rd.active) return fail('That rider isn’t available. Pick another one.');
        upd.rider = { partner: 'Tiada rider', tracking: b.tracking, driver: rd.name, phone: (rd.phone || '').replace(/\D/g, ''), cost: b.cost || 0, rider_id: rd.id };
      } else upd.rider = { partner: b.partner, tracking: b.tracking, driver: b.driver || '', phone: (b.phone || '').replace(/\D/g, ''), cost: b.cost || 0 };
      kind = 'route'; log = `Sent ${o.id} with ${b.partner} (${b.tracking})${b.cost ? ' · paid ' + naira(b.cost) : ''}`; break;
    case 'done':
      await takeStock(); upd.status = 'done'; upd.confirm = { how: b.how, note: b.note || '', by: me.name, at: now };
      kind = 'done'; log = `Marked ${o.id} as delivered (${b.how.toLowerCase()})`; break;
    case 'issue':
      if (o.status !== 'issue') upd.prev_status = o.status;
      upd.status = 'issue'; upd.issue = { reason: b.reason, note: b.note || '', eta: b.eta || '' };
      kind = 'issue'; data = { reason: b.reason, note: b.note, eta: b.eta }; log = `Reported a problem on ${o.id}: ${b.reason}`; break;
    case 'resume':
      if (o.status !== 'issue') return fail('There’s no open problem on this order.');
      upd.status = o.prev_status && !['issue', 'new'].includes(o.prev_status) ? o.prev_status : (o.prev_status === 'new' ? 'new' : 'packed'); upd.issue = null;
      log = `Marked the problem on ${o.id} as sorted`; break;
    case 'refund':
    case 'cancel': {
      const done = (o.refunds || []).reduce((a, r) => a + r.amount, 0), left = (o.paid ?? o.total) - done;
      const full = b.action === 'cancel' || b.full;
      const amount = full ? left : (b.amount || 0);
      if (b.action === 'refund' && (amount <= 0 || amount > left)) return fail(`Enter an amount up to ${naira(left)}.`);
      if (amount > 0) {
        if (!o.pay_ref) return fail('No payment found to refund.');
        try { await paystackRefund(o.pay_ref, amount, `${o.id}: ${b.reason}`); }
        catch (e) { throw new HttpError(502, 'Paystack didn’t accept the refund: ' + (e as Error).message.replace(/^Paystack: /, '')); }
      }
      upd.refunds = [...(o.refunds || []), { amount, reason: b.reason, at: now, by: me.name }];
      if (b.action === 'cancel') {
        upd.status = 'cancelled'; upd.issue = { reason: b.reason, note: b.note || '' };
        if (o.stock_taken && !['route', 'done'].includes(o.status)) { await stock(o, 1); upd.stock_taken = false; }
        kind = 'cancel'; log = `Cancelled ${o.id} and refunded ${naira(amount)} (${b.reason})`;
      } else {
        if (full) upd.status = 'refunded';
        kind = 'refund'; log = `Refunded ${naira(amount)} on ${o.id} (${b.reason})`;
      }
      data = { reason: b.reason, note: b.note, amount, full };
      break;
    }
    case 'note':
      kind = 'note'; data = { note: b.note }; log = `Emailed ${o.name} about ${o.id}`; break;
    case 'edit': {
      // if stock was already taken off, put back the old items and take off the new ones
      const items = b.items.map(it => ({ ...it, pid: it.pid || undefined, kg: it.kg || 0 }));
      if (o.stock_taken) { await stock(o, 1); await stock({ ...o, items } as O, -1); }
      const subtotal = items.reduce((a, it) => a + it.price * it.qty, 0);
      const discount = Math.min(o.discount || 0, subtotal);
      if (o.paid == null) upd.paid = o.total; // keep what they actually paid before the first change
      Object.assign(upd, {
        name: b.name, phone: b.phone.replace(/[^\d+]/g, ''), email: b.email, address: b.address, landmark: b.landmark || null, note: b.note || null,
        items, subtotal, discount, delivery_fee: b.delivery_fee, total: subtotal - discount + b.delivery_fee,
        kg: Math.round(items.reduce((a, it) => a + (it.kg || 0) * it.qty, 0) * 10) / 10,
      });
      const diff = subtotal - discount + b.delivery_fee - o.total;
      log = `Edited ${o.id}${diff ? ` (total ${diff > 0 ? 'up' : 'down'} ${naira(Math.abs(diff))})` : ''}`;
      break;
    }
  }
  let res = await db().from('orders').update(upd).eq('id', o.id).select('*');
  // "paid" and "drop_code" come with the November SQL updates; until they're run, save without them
  if (res.error && /\b(paid|drop_code)\b/.test(res.error.message)) { delete upd.paid; delete upd.drop_code; res = await db().from('orders').update(upd).eq('id', o.id).select('*'); }
  const fresh = must(res) as O[];
  let email: { ok: boolean; error?: string } | null = null;
  if (kind) email = await notifyOrder(fresh[0], kind, data);
  await logAct(me.name, log);
  return ok({ order: fresh[0], email });
});
