import { z } from 'zod';
import { handle, ok, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { ownerContact } from '@/lib/notify';

/** Contact form on the Help page. Saved for the admin desk and emailed to the owner. */
const Body = z.object({
  name: z.string().trim().min(2, 'Add your name.').max(60),
  email: z.string().trim().toLowerCase().email('Enter a full email address so we can reply.').max(120),
  phone: z.string().trim().max(20).optional().nullable(),
  text: z.string().trim().min(5, 'Write a short message.').max(1500),
});
export const POST = handle(async (req: Request) => {
  limit('contact:' + clientIp(req), 5, 10 * 60000);
  const b = Body.parse(await req.json());
  const m = must(await db().from('contact_messages').insert({ name: b.name, email: b.email, phone: b.phone || null, text: b.text }).select('id').single()) as { id: string };
  await ownerContact({ ...b, id: m.id }).catch(e => console.error('contact email', e));
  return ok({ ok: true });
});
