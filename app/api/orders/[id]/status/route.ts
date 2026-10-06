import { handle, ok, fail } from '@/lib/http';
import { db } from '@/lib/db';
import { publicOrder } from '@/lib/orders';
import type { Order } from '@/lib/notify';

export const dynamic = 'force-dynamic';
/** Polled by the payment page. The secret payment reference proves it's the buyer asking. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ref = new URL(req.url).searchParams.get('ref') || '';
  const o = (await db().from('orders').select('*').eq('id', id).maybeSingle()).data as Order | null;
  if (!o || !ref || o.pay_ref !== ref) return fail('Order not found.', 404);
  return ok({ status: o.status, order: o.status === 'pending' ? null : publicOrder(o) });
});
