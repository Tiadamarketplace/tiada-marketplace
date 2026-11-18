import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db } from '@/lib/db';
import { setSession } from '@/lib/session';
import { checkPassword, hashPassword, logAct, ROLE_LABEL, Role, newEmailCode, makeCodeTicket, checkCodeTicket, ticketInfo, maskEmail, sendSignInCode } from '@/lib/staff';

let dummy: Promise<string> | null = null; // so a wrong email takes as long as a wrong password

export const dynamic = 'force-dynamic';
type Row = { id: string; email: string; name: string; role: Role; active: boolean; password_hash: string; totp_secret: string; failed: number; locked_until: string | null };
const Pw = z.object({ step: z.literal('pw'), email: z.string().trim().toLowerCase().email('Enter a valid staff email.'), password: z.string().min(1).max(200) });
const Code = z.object({ step: z.literal('code'), ticket: z.string(), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.') });
const Resend = z.object({ step: z.literal('resend'), ticket: z.string() });

/** Password first, then a 6-digit code we email to the staff member (works 10 minutes). */
async function emailCode(s: Row) {
  const code = newEmailCode();
  const r = await sendSignInCode(s.email, s.name, code);
  if (!r.ok) throw Object.assign(new Error('We couldn’t send the code email just now. Try again in a minute.'), { status: 502 });
  return { ticket: await makeCodeTicket(s.id, code), to: maskEmail(s.email) };
}

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
    return ok(await emailCode(s));
  }
  if (body.step === 'resend') {
    const b = Resend.parse(body);
    const t = await ticketInfo(b.ticket);
    if (!t) return fail('That took too long. Enter your password again.', 400);
    limit('aresend:' + t.sid, 3, 10 * 60000);
    const s = (await db().from('staff').select('*').eq('id', t.sid).maybeSingle()).data as Row | null;
    if (!s || !s.active) return fail('This account is switched off.', 403);
    return ok(await emailCode(s));
  }
  const b = Code.parse(body);
  const t = await ticketInfo(b.ticket);
  if (!t) return fail('That code has expired. Enter your password again for a new one.', 400);
  const s = (await db().from('staff').select('*').eq('id', t.sid).maybeSingle()).data as Row | null;
  if (!s || !s.active) return fail('This account is switched off.', 403);
  if (locked(s)) return fail('Too many wrong attempts. Try again in 15 minutes.', 429);
  const m = await checkCodeTicket(b.ticket, b.code);
  if (!m) { await failed(s); return fail('That code isn’t right. Use the code in the newest email from Tiada.', 401); }
  await db().from('staff').update({ failed: 0, locked_until: null }).eq('id', s.id);
  await setSession('s', { sid: s.id });
  await logAct(s.name, 'Signed in with a code from their email');
  return ok({ staff: { name: s.name, email: s.email, role: ROLE_LABEL[s.role] } });
});
