import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db } from '@/lib/db';
import { verify } from '@/lib/paystack';
import { markPaid, publicOrder } from '@/lib/orders';
import type { Order } from '@/lib/notify';

/** "I've made the payment": ask Paystack right now instead of waiting for the webhook. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  limit('check:' + clientIp(req), 30, 10 * 60000);
  const { id } = await ctx.params;
  const { ref } = z.object({ ref: z.string().max(60) }).parse(await req.json());
  const o = (await db().from('orders').select('*').eq('id', id).maybeSingle()).data as Order | null;
  if (!o || o.pay_ref !== ref) return fail('Order not found.', 404);
  if (o.status !== 'pending') return ok({ status: o.status, order: publicOrder(o) });
  const t = await verify(ref).catch(() => null);
  if (t && t.status === 'success') {
    await markPaid(o.id, t.amount, t.paid_at);
    const fresh = (await db().from('orders').select('*').eq('id', id).single()).data as Order;
    return ok({ status: fresh.status, order: publicOrder(fresh) });
  }
  return ok({ status: 'pending', message: 'We haven’t received the transfer yet. Bank transfers can take a minute or two. This page will update on its own when it lands.' });
});
