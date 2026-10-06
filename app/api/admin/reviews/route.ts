import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';

export const dynamic = 'force-dynamic';
const Body = z.object({ id: z.string().uuid(), status: z.enum(['live', 'hidden', 'pending']).optional(), reply: z.string().trim().max(400).nullable().optional() });
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'reviews');
  const b = Body.parse(await req.json());
  const upd: Record<string, unknown> = {};
  if (b.status) upd.status = b.status;
  if (b.reply !== undefined) upd.reply = b.reply || null;
  const r = must(await db().from('reviews').update(upd).eq('id', b.id).select('stars,product_id').single()) as { stars: number; product_id: string };
  await logAct(me.name, b.status ? `${b.status === 'live' ? 'Approved' : 'Hid'} a ${r.stars}-star review of ${r.product_id}` : `Replied to a review of ${r.product_id}`);
  return ok({ ok: true });
});
