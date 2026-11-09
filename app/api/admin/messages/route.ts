import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';

export const dynamic = 'force-dynamic';
/** Contact-form messages: mark as handled (or not). */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'chat');
  const b = z.object({ id: z.string().uuid(), handled: z.boolean() }).parse(await req.json());
  const r = must(await db().from('contact_messages').update({ handled: b.handled }).eq('id', b.id).select('name').single()) as { name: string };
  if (b.handled) await logAct(me.name, `Marked ${r.name}’s message as handled`);
  return ok({ ok: true });
});
