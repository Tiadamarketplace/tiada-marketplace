import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from './env';

const key = () => new TextEncoder().encode(env.sessionSecret);
type Kind = 'c' | 's'; // customer | staff
const NAME: Record<Kind, string> = { c: 'tiada_s', s: 'tiada_admin' };
const TTL: Record<Kind, number> = { c: 60 * 60 * 24 * 30, s: 60 * 60 * 8 };

export async function setSession(kind: Kind, payload: Record<string, unknown>) {
  const token = await new SignJWT({ ...payload, k: kind })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${TTL[kind]}s`).sign(key());
  (await cookies()).set(NAME[kind], token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: TTL[kind] });
}
export async function clearSession(kind: Kind) { (await cookies()).delete(NAME[kind]); }
export async function readSession<T = Record<string, unknown>>(kind: Kind): Promise<T | null> {
  const t = (await cookies()).get(NAME[kind])?.value;
  if (!t) return null;
  try { const { payload } = await jwtVerify(t, key()); return payload.k === kind ? (payload as T) : null; }
  catch { return null; }
}
