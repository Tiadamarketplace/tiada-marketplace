import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { currentCustomer, requireCustomer } from '@/lib/customer';
import { clearSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const GET = handle(async () => {
  const c = await currentCustomer();
  if (!c) return ok({ user: null });
  const addresses = must(await db().from('addresses').select('id,label,street,landmark,zone_id').eq('customer_id', c.id).order('created_at'));
  return ok({ user: c, addresses });
});
const Patch = z.object({ name: z.string().trim().min(2).max(60).optional(), phone: z.string().trim().regex(/^0[789][01]\d{8}$/, 'Use an 11-digit Nigerian number.').optional(), promo_ok: z.boolean().optional() });
export const PATCH = handle(async (req: Request) => {
  const c = await requireCustomer();
  const b = Patch.parse(await req.json());
  const u = must(await db().from('customers').update(b).eq('id', c.id).select('id,email,name,phone,promo_ok').single());
  return ok({ user: u });
});
/** Delete account: removes profile, addresses, reviews, messages. Orders stay (tax records) but lose the link to the person. */
export const DELETE = handle(async () => {
  const c = await requireCustomer();
  await db().from('orders').update({ customer_id: null }).eq('customer_id', c.id);
  must(await db().from('customers').delete().eq('id', c.id));
  await clearSession('c');
  return ok({ deleted: true });
});
