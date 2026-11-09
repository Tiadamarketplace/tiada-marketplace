import { db } from './db';
import { HttpError } from './http';

export type Voucher = { code: string; kind: 'amt' | 'pct'; value: number; cap: number | null; min_order: number; ends_at: string | null; max_uses: number | null; used: number; once_each: boolean; is_on: boolean };

/** Check a discount code against this cart. Throws a clear message the shopper can act on. */
export async function applyVoucher(raw: string, subtotal: number, email?: string | null): Promise<{ code: string; discount: number }> {
  const code = raw.trim().toUpperCase();
  const v = (await db().from('vouchers').select('*').eq('code', code).maybeSingle()).data as Voucher | null;
  if (!v || !v.is_on) throw new HttpError(400, `“${code}” isn’t a code we recognise. Check the spelling.`);
  if (v.ends_at && new Date(v.ends_at + 'T23:59:59+01:00') < new Date()) throw new HttpError(400, `“${code}” has ended.`);
  if (v.max_uses != null && v.used >= v.max_uses) throw new HttpError(400, `“${code}” has been fully used up.`);
  if (subtotal < v.min_order) throw new HttpError(400, `“${code}” works on orders of ₦${v.min_order.toLocaleString()} or more. Add ₦${(v.min_order - subtotal).toLocaleString()} more to use it.`);
  if (v.once_each && email) {
    const { count } = await db().from('orders').select('id', { count: 'exact', head: true })
      .eq('voucher', code).ilike('email', email).not('status', 'in', '(pending,expired,cancelled)');
    if ((count || 0) > 0) throw new HttpError(400, `You’ve already used “${code}”. It works once per customer.`);
  }
  let off = v.kind === 'pct' ? Math.round((subtotal * v.value) / 100) : v.value;
  if (v.kind === 'pct' && v.cap) off = Math.min(off, v.cap);
  return { code, discount: Math.max(0, Math.min(off, subtotal)) };
}

/** Count a use once the order is paid. */
export async function countVoucherUse(code: string | null) {
  if (!code) return;
  const v = (await db().from('vouchers').select('used').eq('code', code).maybeSingle()).data as { used: number } | null;
  if (v) await db().from('vouchers').update({ used: v.used + 1 }).eq('code', code);
}
