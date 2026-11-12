import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { SignJWT, jwtVerify } from 'jose';
import { requireStaff, logAct, hashPassword, checkPassword, newTotp, checkTotp, qrDataUrl, tempPassword } from '@/lib/staff';
import { env } from '@/lib/env';

const jwtKey = () => new TextEncoder().encode(env.sessionSecret);

export const dynamic = 'force-dynamic';
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), name: z.string().trim().min(2).max(60), email: z.string().trim().toLowerCase().email(), role: z.enum(['staff', 'support', 'owner']) }),
  z.object({ action: z.literal('reset'), id: z.string().uuid() }),
  z.object({ action: z.literal('active'), id: z.string().uuid(), active: z.boolean() }),
  z.object({ action: z.literal('totp_start'), current: z.string().min(1).max(200) }),
  z.object({ action: z.literal('totp_confirm'), ticket: z.string().min(10).max(2000), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.') }),
  z.object({ action: z.literal('password'), current: z.string().min(1).max(200), next: z.string().min(10, 'Use at least 10 characters.').max(200) }),
]);

export const POST = handle(async (req: Request) => {
  const b = Body.parse(await req.json());
  // change your own authenticator (new phone): password first, then a code from the new QR
  if (b.action === 'totp_start') {
    const me = await requireStaff(req);
    const row = must(await db().from('staff').select('password_hash').eq('id', me.id).single()) as { password_hash: string };
    if (!(await checkPassword(b.current, row.password_hash))) return fail('Your current password is wrong.');
    const t = newTotp(me.email);
    const ticket = await new SignJWT({ k: 'totp', sid: me.id, secret: t.secret }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(jwtKey());
    return ok({ ticket, qr: await qrDataUrl(t.uri), secret: t.secret });
  }
  if (b.action === 'totp_confirm') {
    const me = await requireStaff(req);
    let p: { k?: string; sid?: string; secret?: string } = {};
    try { p = (await jwtVerify(b.ticket, jwtKey())).payload as typeof p; } catch { return fail('That took too long. Start again.', 400); }
    if (p.k !== 'totp' || p.sid !== me.id || !p.secret) return fail('Start again.', 400);
    if (!checkTotp(p.secret, b.code)) return fail('That code doesn’t match. Use the newest code for Tiada in your authenticator app.', 400);
    await db().from('staff').update({ totp_secret: p.secret }).eq('id', me.id);
    await logAct(me.name, 'Changed their authenticator');
    return ok({ ok: true });
  }
  if (b.action === 'password') {
    const me = await requireStaff(req);
    const row = must(await db().from('staff').select('password_hash').eq('id', me.id).single()) as { password_hash: string };
    if (!(await checkPassword(b.current, row.password_hash))) return fail('Your current password is wrong.');
    await db().from('staff').update({ password_hash: await hashPassword(b.next) }).eq('id', me.id);
    await logAct(me.name, 'Changed their password');
    return ok({ ok: true });
  }
  const me = await requireStaff(req, 'team');
  if (b.action === 'add') {
    const exists = (await db().from('staff').select('id').eq('email', b.email).maybeSingle()).data;
    if (exists) return fail('Someone already uses that email.');
    const pw = tempPassword(), t = newTotp(b.email);
    must(await db().from('staff').insert({ name: b.name, email: b.email, role: b.role, password_hash: await hashPassword(pw), totp_secret: t.secret }));
    await logAct(me.name, `Added ${b.name} as ${b.role}`);
    return ok({ password: pw, qr: await qrDataUrl(t.uri), secret: t.secret });
  }
  if (b.id === me.id) return fail('You can’t change your own access here.');
  const s = must(await db().from('staff').select('id,name,email').eq('id', b.id).maybeSingle()) as { id: string; name: string; email: string } | null;
  if (!s) return fail('Staff member not found.', 404);
  if (b.action === 'active') {
    await db().from('staff').update({ active: b.active }).eq('id', s.id);
    await logAct(me.name, `${b.active ? 'Switched on' : 'Switched off'} ${s.name}’s access`);
    return ok({ ok: true });
  }
  const pw = tempPassword(), t = newTotp(s.email);
  await db().from('staff').update({ password_hash: await hashPassword(pw), totp_secret: t.secret, failed: 0, locked_until: null }).eq('id', s.id);
  await logAct(me.name, `Reset ${s.name}’s password and authenticator`);
  return ok({ password: pw, qr: await qrDataUrl(t.uri), secret: t.secret });
});
