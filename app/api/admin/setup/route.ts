import crypto from 'crypto';
import { z } from 'zod';
import { SignJWT, jwtVerify } from 'jose';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { env } from '@/lib/env';
import { setSession } from '@/lib/session';
import { hashPassword, newTotp, checkTotp, qrDataUrl, logAct } from '@/lib/staff';

export const dynamic = 'force-dynamic';
const key = () => new TextEncoder().encode(env.sessionSecret);
const noStaffYet = async () => ((await db().from('staff').select('id', { count: 'exact', head: true })).count || 0) === 0;

/** Is the one-time owner setup still open? */
export const GET = handle(async () => ok({ needed: await noStaffYet() }));

const Start = z.object({ action: z.literal('start'), token: z.string().min(1), name: z.string().trim().min(2).max(60), email: z.string().trim().toLowerCase().email(), password: z.string().min(10, 'Use at least 10 characters for the password.').max(200) });
const Finish = z.object({ action: z.literal('finish'), ticket: z.string(), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.') });

export const POST = handle(async (req: Request) => {
  limit('setup:' + clientIp(req), 10, 15 * 60000);
  if (!(await noStaffYet())) return fail('Setup is already done. Sign in instead.', 409);
  const body = await req.json();
  if (body.action === 'start') {
    const b = Start.parse(body);
    const want = env.setupToken, got = b.token;
    if (!want || want.length !== got.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(got))) return fail('That setup key is wrong. It’s the SETUP_TOKEN value in Vercel.', 403);
    const t = newTotp(b.email);
    const ticket = await new SignJWT({ k: 'setup', name: b.name, email: b.email, hash: await hashPassword(b.password), secret: t.secret })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(key());
    return ok({ ticket, qr: await qrDataUrl(t.uri), secret: t.secret });
  }
  const b = Finish.parse(body);
  let p: Record<string, string>;
  try { p = (await jwtVerify(b.ticket, key())).payload as Record<string, string>; } catch { return fail('Setup timed out. Start again.', 400); }
  if (p.k !== 'setup') return fail('Setup timed out. Start again.', 400);
  if (!checkTotp(p.secret, b.code)) return fail('That code doesn’t match. Check the time on your phone and try the newest code.', 400);
  const st = must(await db().from('staff').insert({ email: p.email, name: p.name, role: 'owner', password_hash: p.hash, totp_secret: p.secret }).select('id,name').single()) as { id: string; name: string };
  await setSession('s', { sid: st.id });
  await logAct(st.name, 'Created the owner account and signed in');
  return ok({ staff: { name: p.name, email: p.email, role: 'Owner' } });
});
