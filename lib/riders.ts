import { randomBytes } from 'crypto';
import { db } from './db';
import { HttpError } from './http';

export type Rider = { id: string; name: string; phone: string | null; token: string; active: boolean; created_at: string };

/** A long random link part. Whoever has the link can see that rider's drops, so it's 24 bytes of randomness. */
export const newToken = () => randomBytes(24).toString('base64url');

/** All riders, or [] if the riders table isn't there yet (before 2026-11-riders.sql is run). */
export async function listRiders(): Promise<Rider[]> {
  const r = await db().from('riders').select('*').order('created_at');
  if (r.error) { if (/riders/.test(r.error.message)) return []; throw r.error; }
  return (r.data || []) as Rider[];
}

/** The rider behind a private link. Switched-off riders and unknown links get the same answer. */
export async function riderByToken(token: string): Promise<Rider> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw new HttpError(404, 'This rider link doesn’t work. Ask the office for a new one.');
  const r = await db().from('riders').select('*').eq('token', token).maybeSingle();
  const rider = r.data as Rider | null;
  if (!rider || !rider.active) throw new HttpError(404, 'This rider link doesn’t work. Ask the office for a new one.');
  return rider;
}
