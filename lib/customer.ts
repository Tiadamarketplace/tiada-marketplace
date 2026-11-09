import { readSession } from './session';
import { db, must } from './db';
import { HttpError } from './http';

export type Customer = { id: string; email: string; name: string | null; phone: string | null; promo_ok: boolean; created_at?: string };
export async function currentCustomer(): Promise<Customer | null> {
  const s = await readSession<{ cid: string }>('c');
  if (!s?.cid) return null;
  const r = await db().from('customers').select('id,email,name,phone,promo_ok,created_at').eq('id', s.cid).maybeSingle();
  return (r.data as Customer) || null;
}
export async function requireCustomer(): Promise<Customer> {
  const c = await currentCustomer();
  if (!c) throw new HttpError(401, 'Please sign in first.');
  return c;
}

/** Save an address. The map spot needs the 2026-11-address.sql update; until it's run, the address is saved without it. */
export async function saveAddress(row: { customer_id: string; label: string; street: string; landmark: string | null; zone_id: string | null; spot: unknown }) {
  const cols = 'id,label,street,landmark,zone_id';
  let r = await db().from('addresses').insert(row).select(cols + ',spot').single();
  if (r.error && /spot/.test(r.error.message)) { const { spot, ...rest } = row; void spot; r = await db().from('addresses').insert(rest).select(cols).single(); }
  return must(r);
}
