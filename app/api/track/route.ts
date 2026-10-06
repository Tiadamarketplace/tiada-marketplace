import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db } from '@/lib/db';
import { publicOrder } from '@/lib/orders';
import type { Order } from '@/lib/notify';

const Body = z.object({ code: z.string().trim().toUpperCase().regex(/^TD-\d{5,9}$/, 'Enter a code like TD-84920.'), last4: z.string().regex(/^\d{4}$/, 'Enter the last 4 digits of your phone.') });
export const POST = handle(async (req: Request) => {
  limit('track:' + clientIp(req), 20, 10 * 60000);
  const b = Body.parse(await req.json());
  const o = (await db().from('orders').select('*').eq('id', b.code).not('status', 'in', '(pending,expired)').maybeSingle()).data as Order | null;
  const notFound = () => fail('We couldn’t find an order with those details. Check the code and the last 4 digits of the phone used at checkout.', 404);
  if (!o) return notFound();
  const fails = (o as Order & { track_fails?: number }).track_fails || 0;
  if (fails >= 10) return fail('Too many wrong tries for this order. Sign in to your account to see it, or message us on WhatsApp.', 429);
  if (!o.phone.endsWith(b.last4)) { await db().from('orders').update({ track_fails: fails + 1 }).eq('id', o.id); return notFound(); }
  // tracking without signing in shows the delivery progress, not the customer's personal details
  const p = publicOrder(o) as Record<string, unknown>;
  return ok({ order: { ...p, email: '', phone: '', name: '', address: (o.address || '').split(',').slice(-1)[0].trim(), landmark: null, pay_account: null } });
});
