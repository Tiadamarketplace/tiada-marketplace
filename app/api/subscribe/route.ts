import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db } from '@/lib/db';
import { welcomeList } from '@/lib/notify';

/** Footer newsletter sign-up, and the one-click unsubscribe link in deal emails. */
const Body = z.object({ email: z.string().trim().toLowerCase().email('Enter a full email address.').max(120), source: z.string().max(20).optional() });
export const POST = handle(async (req: Request) => {
  limit('sub:' + clientIp(req), 10, 10 * 60000);
  const { email } = Body.parse(await req.json());
  const had = (await db().from('subscribers').select('email,left_at').eq('email', email).maybeSingle()).data as { left_at: string | null } | null;
  if (had && !had.left_at) return ok({ ok: true, already: true });
  const r = had ? await db().from('subscribers').update({ left_at: null }).eq('email', email).select('token').single()
    : await db().from('subscribers').insert({ email }).select('token').single();
  if (r.error) throw new Error(r.error.message);
  await db().from('customers').update({ promo_ok: true }).eq('email', email);
  await welcomeList(email, (r.data as { token: string }).token).catch(e => console.error('welcome list email', e));
  return ok({ ok: true });
});
export const DELETE = handle(async (req: Request) => {
  const u = new URL(req.url); const email = (u.searchParams.get('email') || '').toLowerCase(); const token = u.searchParams.get('t') || '';
  const s = (await db().from('subscribers').select('token').eq('email', email).maybeSingle()).data as { token: string } | null;
  if (!s || s.token !== token) return fail('This link has expired.', 404);
  await db().from('subscribers').update({ left_at: new Date().toISOString() }).eq('email', email);
  await db().from('customers').update({ promo_ok: false }).eq('email', email);
  return ok({ ok: true });
});
