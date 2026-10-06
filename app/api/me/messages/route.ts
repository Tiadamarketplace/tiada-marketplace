import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireCustomer } from '@/lib/customer';

export const dynamic = 'force-dynamic';
export const GET = handle(async () => {
  const c = await requireCustomer();
  return ok({ messages: must(await db().from('messages').select('id,order_id,kind,title,body,read,created_at').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(100)) });
});
const Body = z.object({ ids: z.array(z.string().uuid()).max(200).optional(), all: z.boolean().optional(), read: z.boolean().default(true), remove: z.boolean().optional() });
export const POST = handle(async (req: Request) => {
  const c = await requireCustomer();
  const b = Body.parse(await req.json());
  let q = b.remove ? db().from('messages').delete() : db().from('messages').update({ read: b.read });
  q = q.eq('customer_id', c.id);
  if (!b.all) q = q.in('id', b.ids || []);
  must(await q);
  return ok({ ok: true });
});
