import { readSession } from './session';
import { db } from './db';
import { HttpError } from './http';

export type Customer = { id: string; email: string; name: string | null; phone: string | null; promo_ok: boolean };
export async function currentCustomer(): Promise<Customer | null> {
  const s = await readSession<{ cid: string }>('c');
  if (!s?.cid) return null;
  const r = await db().from('customers').select('id,email,name,phone,promo_ok').eq('id', s.cid).maybeSingle();
  return (r.data as Customer) || null;
}
export async function requireCustomer(): Promise<Customer> {
  const c = await currentCustomer();
  if (!c) throw new HttpError(401, 'Please sign in first.');
  return c;
}
