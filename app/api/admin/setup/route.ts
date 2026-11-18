import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { env } from '@/lib/env';
import { setSession } from '@/lib/session';
import { hashPassword, newTotp, logAct, newEmailCode, makeCodeTicket, checkCodeTicket, maskEmail, sendSignInCode } from '@/lib/staff';

export const dynamic = 'force-dynamic';
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
    // prove the email works: we send a code to it
    const code = newEmailCode();
    const sent = await sendSignInCode(b.email, b.name, code, 'finish setting up');
    if (!sent.ok) return fail('We couldn’t send an email to that address. Check it, and that Resend is set up.', 502);
    const ticket = await makeCodeTicket('setup:' + b.email, code, 'setup', { name: b.name, email: b.email, hash: await hashPassword(b.password) });
    return ok({ ticket, to: maskEmail(b.email) });
  }
  const b = Finish.parse(body);
  const p = await checkCodeTicket(b.ticket, b.code, 'setup');
  if (p === null) return fail('Setup timed out. Start again.', 400);
  if (p === false) return fail('That code doesn’t match. Use the code in the email we just sent.', 400);
  // the authenticator column is no longer used for sign-in; it's filled so older databases accept the row
  const st = must(await db().from('staff').insert({ email: p.email, name: p.name, role: 'owner', password_hash: p.hash, totp_secret: newTotp(p.email).secret }).select('id,name').single()) as { id: string; name: string };
  await setSession('s', { sid: st.id });
  await logAct(st.name, 'Created the owner account and signed in');
  return ok({ staff: { name: p.name, email: p.email, role: 'Owner' } });
});
