import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { SignJWT, jwtVerify } from 'jose';
import { readSession } from './session';
import { db, must } from './db';
import { env } from './env';
import { HttpError } from './http';

export type Role = 'owner' | 'staff' | 'support';
export type Staff = { id: string; email: string; name: string; role: Role; active: boolean };

/** What each role may do. Owners can do everything. */
const CAN: Record<string, Role[]> = {
  orders: ['owner', 'staff'],
  refund: ['owner'],
  catalog: ['owner', 'staff'],
  store: ['owner'],
  chat: ['owner', 'staff', 'support'],
  reviews: ['owner', 'support'],
  broadcast: ['owner'],
  team: ['owner'],
};

export async function currentStaff(): Promise<Staff | null> {
  const s = await readSession<{ sid: string }>('s');
  if (!s?.sid) return null;
  const r = await db().from('staff').select('id,email,name,role,active').eq('id', s.sid).maybeSingle();
  const st = r.data as Staff | null;
  return st && st.active ? st : null;
}

/** Use at the top of every admin route. Blocks other websites from posting with the staff cookie. */
export async function requireStaff(req: Request, area?: keyof typeof CAN): Promise<Staff> {
  if (req.method !== 'GET') {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    let same = true;
    if (origin) { try { same = !host || new URL(origin).host === host; } catch { same = false; } }
    if (!same) throw new HttpError(403, 'Blocked: request came from another website.');
  }
  const st = await currentStaff();
  if (!st) throw new HttpError(401, 'Your session has ended. Please sign in again.');
  if (area && !CAN[area].includes(st.role)) throw new HttpError(403, 'Your account can’t do that. Ask the owner.');
  return st;
}

export async function logAct(name: string, text: string) {
  try { await db().from('activity').insert({ staff_name: name, text: text.slice(0, 300) }); } catch (e) { console.error('activity', e); }
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function newTotp(email: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ issuer: 'Tiada Admin', label: email, algorithm: 'SHA1', digits: 6, period: 30, secret });
  return { secret: secret.base32, uri: totp.toString() };
}
export function checkTotp(secretB32: string, code: string) {
  const totp = new OTPAuth.TOTP({ issuer: 'Tiada Admin', algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secretB32) });
  return totp.validate({ token: code, window: 1 }) !== null;
}
export const qrDataUrl = (uri: string) => QRCode.toDataURL(uri, { margin: 1, width: 240, color: { dark: '#0B3A23', light: '#FFFFFF' } });

/** A random password that is easy to read out: 4 groups of 4 letters/digits. */
export function tempPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(16);
  return Array.from(b, x => abc[x % abc.length]).join('').replace(/(.{4})(?=.)/g, '$1-');
}

/** Short-lived ticket between the password step and the 6-digit-code step. */
const key = () => new TextEncoder().encode(env.sessionSecret);
export const makeTicket = (sid: string) => new SignJWT({ sid, k: 'pw' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m').sign(key());
export async function readTicket(t: string): Promise<string | null> {
  try { const { payload } = await jwtVerify(t, key()); return payload.k === 'pw' ? String(payload.sid) : null; } catch { return null; }
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', staff: 'Staff', support: 'Support' };
export async function staffList() {
  return must(await db().from('staff').select('id,email,name,role,active,created_at').order('created_at')) as (Staff & { created_at: string })[];
}
