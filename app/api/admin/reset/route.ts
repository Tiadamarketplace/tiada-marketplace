import crypto from 'crypto';
import { z } from 'zod';
import { SignJWT, jwtVerify } from 'jose';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { layout, sendEmail } from '@/lib/email';
import { hashPassword, checkTotp, newTotp, qrDataUrl, logAct, Role } from '@/lib/staff';

/**
 * Forgot password for staff.
 *  1. request: we email a reset link (valid 30 minutes). The reply is the same whether or not the email exists.
 *  2. finish:  new password + the 6-digit code from the authenticator app. The link stops working once used,
 *              because it is tied to the old password.
 *  Owner who also lost the authenticator: the SETUP_TOKEN from Vercel replaces the code, and a new
 *  authenticator is set up (3. confirm).
 */
export const dynamic = 'force-dynamic';
const key = () => new TextEncoder().encode(env.sessionSecret);
const fp = (hash: string) => crypto.createHash('sha256').update(hash).digest('hex').slice(0, 24);
type Row = { id: string; email: string; name: string; role: Role; active: boolean; password_hash: string; totp_secret: string; failed: number; locked_until: string | null };
const GENERIC = 'If that email belongs to a staff account, a reset link is on its way. It works for 30 minutes.';
const BAD_LINK = 'This reset link has expired or was already used. Ask for a new one.';

const Req = z.object({ action: z.literal('request'), email: z.string().trim().toLowerCase().email('Enter a valid staff email.') });
const Fin = z.object({ action: z.literal('finish'), token: z.string().min(10), password: z.string().min(10, 'Use at least 10 characters for the password.').max(200),
  code: z.string().regex(/^\d{6}$/).optional(), setupKey: z.string().min(1).max(300).optional() });
const Conf = z.object({ action: z.literal('confirm'), ticket: z.string().min(10), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.') });

async function readToken(t: string, kind: string) {
  try { const p = (await jwtVerify(t, key())).payload as Record<string, string>; return p.k === kind ? p : null; } catch { return null; }
}
const staffById = async (id: string) => (await db().from('staff').select('*').eq('id', id).maybeSingle()).data as Row | null;
const locked = (s: Row) => s.locked_until && Date.parse(s.locked_until) > Date.now();
async function failed(s: Row) {
  const n = s.failed + 1;
  await db().from('staff').update({ failed: n >= 5 ? 0 : n, locked_until: n >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : s.locked_until }).eq('id', s.id);
}

export const POST = handle(async (req: Request) => {
  const ip = clientIp(req);
  const body = await req.json();

  if (body.action === 'request') {
    limit('areset:' + ip, 5, 15 * 60000);
    const b = Req.parse(body);
    limit('areset-e:' + b.email, 3, 60 * 60000);
    const s = (await db().from('staff').select('*').eq('email', b.email).maybeSingle()).data as Row | null;
    if (s && s.active) {
      const token = await new SignJWT({ k: 'reset', sid: s.id, fp: fp(s.password_hash) }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30m').sign(key());
      const url = `${env.siteUrl}/admin#reset=${token}`;
      const html = layout({ heading: 'Reset your admin password', preheader: 'This link works for 30 minutes',
        bodyHtml: `<p>Hi ${s.name.split(' ')[0].replace(/[<>&"']/g, '')},</p><p>Someone asked to reset the password for your Tiada Admin Desk account. Tap the button below to choose a new one. You’ll also need the 6-digit code from your authenticator app.</p><p style="color:#6B7A70;font-size:13px">The link works once, for 30 minutes. If you didn’t ask for this, ignore this email and your password stays the same.</p>`,
        cta: { label: 'Choose a new password', url } });
      await sendEmail(s.email, 'Reset your Tiada admin password', html, `Reset your Tiada admin password: ${url} (works for 30 minutes)`);
      await logAct(s.name, 'Asked for a password reset link');
    }
    return ok({ message: GENERIC });
  }

  if (body.action === 'finish') {
    limit('areset-f:' + ip, 10, 15 * 60000);
    const b = Fin.parse(body);
    const p = await readToken(b.token, 'reset');
    if (!p) return fail(BAD_LINK, 400);
    const s = await staffById(p.sid);
    if (!s || !s.active || fp(s.password_hash) !== p.fp) return fail(BAD_LINK, 400);
    if (locked(s)) return fail('Too many wrong attempts. Try again in 15 minutes.', 429);

    if (b.setupKey) {
      // lost authenticator too: only the owner, only with the setup key from Vercel
      const want = env.setupToken;
      if (s.role !== 'owner' || !want || want.length !== b.setupKey.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(b.setupKey))) {
        await failed(s); return fail('That setup key is wrong, or this account can’t use it. Ask the owner to reset your access instead.', 403);
      }
      const t = newTotp(s.email);
      const ticket = await new SignJWT({ k: 'reset2', sid: s.id, fp: p.fp, hash: await hashPassword(b.password), secret: t.secret })
        .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(key());
      return ok({ ticket, qr: await qrDataUrl(t.uri), secret: t.secret });
    }

    if (!b.code) return fail('Enter the 6-digit code from your authenticator app.', 400);
    if (!checkTotp(s.totp_secret, b.code)) { await failed(s); return fail('That code isn’t right. Use the newest code in your authenticator app.', 401); }
    const upd = await db().from('staff').update({ password_hash: await hashPassword(b.password), failed: 0, locked_until: null })
      .eq('id', s.id).eq('password_hash', s.password_hash).select('id');
    if (!upd.data?.length) return fail(BAD_LINK, 400);
    await logAct(s.name, 'Reset their password with an email link');
    return ok({ done: true, email: s.email });
  }

  const b = Conf.parse(body);
  limit('areset-c:' + ip, 10, 15 * 60000);
  const p = await readToken(b.ticket, 'reset2');
  if (!p) return fail('That took too long. Open the reset link again.', 400);
  if (!checkTotp(p.secret, b.code)) return fail('That code doesn’t match. Check the time on your phone and try the newest code.', 400);
  const s = await staffById(p.sid);
  if (!s || !s.active || fp(s.password_hash) !== p.fp) return fail(BAD_LINK, 400);
  const upd = await db().from('staff').update({ password_hash: p.hash, totp_secret: p.secret, failed: 0, locked_until: null })
    .eq('id', s.id).eq('password_hash', s.password_hash).select('id');
  if (!upd.data?.length) return fail(BAD_LINK, 400);
  await logAct(s.name, 'Reset their password and authenticator with the setup key');
  return ok({ done: true, email: s.email });
});
