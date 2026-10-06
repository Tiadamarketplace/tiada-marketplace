import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db } from '@/lib/db';
import { setSession } from '@/lib/session';
import { checkPassword, hashPassword, checkTotp, makeTicket, readTicket, logAct, ROLE_LABEL, Role } from '@/lib/staff';

let dummy: Promise<string> | null = null; // so a wrong email takes as long as a wrong password

export const dynamic = 'force-dynamic';
type Row = { id: string; email: string; name: string; role: Role; active: boolean; password_hash: string; totp_secret: string; failed: number; locked_until: string | null };
const Pw = z.object({ step: z.literal('pw'), email: z.string().trim().toLowerCase().email('Enter a valid staff email.'), password: z.string().min(1).max(200) });
const Code = z.object({ step: z.literal('code'), ticket: z.string(), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.') });

async function failed(s: Row) {
  const n = s.failed + 1;
  await db().from('staff').update({ failed: n >= 5 ? 0 : n, locked_until: n >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : s.locked_until }).eq('id', s.id);
  if (n >= 5) await logAct(s.name, 'Account locked for 15 minutes after 5 wrong attempts');
}
const locked = (s: Row) => s.locked_until && Date.parse(s.locked_until) > Date.now();

export const POST = handle(async (req: Request) => {
  limit('alogin:' + clientIp(req), 20, 15 * 60000);
  const body = await req.json();
  if (body.step === 'pw') {
    const b = Pw.parse(body);
    const s = (await db().from('staff').select('*').eq('email', b.email).maybeSingle()).data as Row | null;
    if (!s || !s.active) { await checkPassword(b.password, await (dummy ||= hashPassword('not-a-real-password'))); return fail('Email or password is wrong.', 401); }
    if (locked(s)) return fail('Too many wrong attempts. Try again in 15 minutes.', 429);
    if (!(await checkPassword(b.password, s.password_hash))) { await failed(s); return fail('Email or password is wrong.', 401); }
    return ok({ ticket: await makeTicket(s.id) });
  }
  const b = Code.parse(body);
  const sid = await readTicket(b.ticket);
  if (!sid) return fail('That took too long. Enter your password again.', 400);
  const s = (await db().from('staff').select('*').eq('id', sid).maybeSingle()).data as Row | null;
  if (!s || !s.active) return fail('This account is switched off.', 403);
  if (locked(s)) return fail('Too many wrong attempts. Try again in 15 minutes.', 429);
  if (!checkTotp(s.totp_secret, b.code)) { await failed(s); return fail('That code isn’t right. Use the newest code in your authenticator app.', 401); }
  await db().from('staff').update({ failed: 0, locked_until: null }).eq('id', s.id);
  await setSession('s', { sid: s.id });
  await logAct(s.name, 'Signed in with two-step check');
  return ok({ staff: { name: s.name, email: s.email, role: ROLE_LABEL[s.role] } });
});
