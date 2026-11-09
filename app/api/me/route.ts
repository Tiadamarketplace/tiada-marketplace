import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { currentCustomer, requireCustomer } from '@/lib/customer';
import { clearSession, readSession, setSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const GET = handle(async () => {
  const c = await currentCustomer();
  if (!c) return ok({ user: null });
  // stay signed in while you keep using the shop: renew the 30-day sign-in once a day
  const s = await readSession<{ iat?: number }>('c');
  if (s?.iat && Date.now() / 1000 - s.iat > 86400) { await setSession('c', { cid: c.id }); await db().from('customers').update({ last_seen: new Date().toISOString() }).eq('id', c.id); }
  const addresses = must(await db().from('addresses').select('id,label,street,landmark,zone_id').eq('customer_id', c.id).order('created_at'));
  return ok({ user: c, addresses });
});
const Patch = z.object({ name: z.string().trim().min(2, 'Add your full name.').max(60).optional(), phone: z.string().trim().transform(s => s.replace(/[\s-]/g, '').replace(/^\+?234/, '0')).pipe(z.string().regex(/^0[789][01]\d{8}$/, 'Use an 11-digit Nigerian number, like 0803 000 0000.')).optional(), promo_ok: z.boolean().optional() });
export const PATCH = handle(async (req: Request) => {
  const c = await requireCustomer();
  const b = Patch.parse(await req.json());
  const u = must(await db().from('customers').update(b).eq('id', c.id).select('id,email,name,phone,promo_ok,created_at').single());
  // keep the deals-email list in step with the switch on the profile
  if (b.promo_ok === true) await db().from('subscribers').upsert({ email: c.email, left_at: null }, { onConflict: 'email' });
  if (b.promo_ok === false) await db().from('subscribers').update({ left_at: new Date().toISOString() }).eq('email', c.email);
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
