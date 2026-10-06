import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { setSession } from '@/lib/session';

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
  name: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(20).optional(),
  promo_ok: z.boolean().optional(),
});
export const POST = handle(async (req: Request) => {
  const b = Body.parse(await req.json());
  limit('verify:' + clientIp(req), 20, 10 * 60000);
  const rows = must(await db().from('login_codes').select('*').eq('email', b.email).eq('used', false).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1)) as { id: string; code_hash: string; attempts: number }[];
  const row = rows[0];
  if (!row) return fail('That code has expired. Ask for a new one.', 400);
  if (row.attempts >= 5) return fail('Too many wrong codes. Ask for a new one.', 429);
  // count this try first, in one conditional update, so parallel guesses can't get more than 5 tries
  const claimed = must(await db().from('login_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id).eq('attempts', row.attempts).select('id')) as unknown[];
  if (!claimed.length) return fail('Please try again.', 409);
  const hash = crypto.createHash('sha256').update(b.code + b.email).digest('hex');
  const good = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(row.code_hash));
  if (!good) return fail(`That code isn’t right. ${Math.max(0, 4 - row.attempts)} tries left.`, 400);
  const used = must(await db().from('login_codes').update({ used: true }).eq('id', row.id).eq('used', false).select('id')) as unknown[];
  if (!used.length) return fail('That code was already used. Ask for a new one.', 400);
  let c = (await db().from('customers').select('*').eq('email', b.email).maybeSingle()).data;
  const isNew = !c;
  if (!c) c = must(await db().from('customers').insert({ email: b.email, name: b.name || null, phone: b.phone || null, promo_ok: !!b.promo_ok }).select('*').single());
  else if ((b.name && !c.name) || (b.phone && !c.phone)) c = must(await db().from('customers').update({ name: c.name || b.name, phone: c.phone || b.phone }).eq('id', c.id).select('*').single());
  await db().from('customers').update({ last_seen: new Date().toISOString() }).eq('id', c.id);
  await db().from('orders').update({ customer_id: c.id }).eq('email', b.email).is('customer_id', null);
  await db().from('messages').insert({ customer_id: c.id, kind: 'security', title: 'New sign-in to your account', body: 'You signed in just now. If this wasn’t you, message us on WhatsApp right away.' });
  await setSession('c', { cid: c.id });
  return ok({ user: { id: c.id, email: c.email, name: c.name, phone: c.phone, promo_ok: c.promo_ok }, isNew });
});
