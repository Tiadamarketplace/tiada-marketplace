import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { env } from '@/lib/env';
import { requireStaff, logAct } from '@/lib/staff';
import { markPaid } from '@/lib/orders';

export const dynamic = 'force-dynamic';
/** TEST MODE ONLY: Paystack test accounts can't receive a real transfer, so the owner can mark a test order as paid
 *  to try the rest of the flow (emails, admin desk). Refuses to run with a live Paystack key. */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'refund');
  if (!env.paystackKey.startsWith('sk_test_')) return fail('This only works while Paystack is in test mode.', 403);
  const b = z.object({ id: z.string().max(20) }).parse(await req.json());
  const o = must(await db().from('orders').select('id,total,status').eq('id', b.id).maybeSingle()) as { id: string; total: number; status: string } | null;
  if (!o || o.status !== 'pending') return fail('That order isn’t waiting for payment.');
  const r = await markPaid(o.id, o.total * 100);
  await logAct(me.name, `Marked test order ${o.id} as paid (test mode)`);
  return ok(r);
});
