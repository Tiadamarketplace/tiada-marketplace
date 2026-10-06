import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireCustomer } from '@/lib/customer';

const Body = z.object({ label: z.string().trim().min(1).max(20), street: z.string().trim().min(6, 'Add a house number and street.').max(160), landmark: z.string().trim().max(120).optional().nullable(), zone_id: z.string().max(40) });
export const POST = handle(async (req: Request) => {
  const c = await requireCustomer();
  const b = Body.parse(await req.json());
  const n = (await db().from('addresses').select('id', { count: 'exact', head: true }).eq('customer_id', c.id)).count || 0;
  if (n >= 5) return fail('You can save up to 5 addresses.');
  return ok({ address: must(await db().from('addresses').insert({ ...b, customer_id: c.id }).select('id,label,street,landmark,zone_id').single()) });
});
export const DELETE = handle(async (req: Request) => {
  const c = await requireCustomer();
  const id = new URL(req.url).searchParams.get('id') || '';
  must(await db().from('addresses').delete().eq('id', id).eq('customer_id', c.id));
  return ok({ ok: true });
});
