import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db } from '@/lib/db';
import { publicOrder } from '@/lib/orders';
import type { Order } from '@/lib/notify';

/** Track an order with just its code. Without signing in, it shows delivery progress only: no name, phone, email or street address. */
const Body = z.object({ code: z.string().trim().toUpperCase().regex(/^TD-\d{5,9}$/, 'Enter a code like TD-48213.') });
export const POST = handle(async (req: Request) => {
  limit('track:' + clientIp(req), 20, 10 * 60000);
  const b = Body.parse(await req.json());
  const o = (await db().from('orders').select('*').eq('id', b.code).not('status', 'in', '(pending,expired)').maybeSingle()).data as Order | null;
  if (!o) return fail('We couldn’t find an order with that code. Check it against your confirmation email.', 404);
  const p = publicOrder(o) as Record<string, unknown>;
  return ok({ order: { ...p, email: '', phone: '', name: '', address: '', landmark: null, pay_account: null, drop_code: null } });
});
