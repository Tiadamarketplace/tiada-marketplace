import crypto from 'crypto';
import { env } from './env';

const API = 'https://api.paystack.co';
async function call(path: string, init?: RequestInit) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${env.paystackKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status === false) throw new Error(`Paystack: ${j.message || r.status}`);
  return j.data;
}

/** "Pay with Transfer": Paystack creates a one-time bank account for this exact amount. */
export async function createTransferAccount(o: { email: string; amountNaira: number; reference: string; orderId: string; minutes?: number }) {
  const expires = new Date(Date.now() + (o.minutes || 30) * 60000).toISOString();
  const d = await call('/charge', { method: 'POST', body: JSON.stringify({
    email: o.email, amount: o.amountNaira * 100, reference: o.reference,
    bank_transfer: { account_expires_at: expires },
    metadata: { order_id: o.orderId },
  }) });
  return { bank: d.bank?.name || d.bank_name || 'Bank', number: d.account_number, name: d.account_name || 'Tiada Marketplace', expires_at: d.account_expires_at || expires, display: d.display_text || '' };
}
export async function verify(reference: string) {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`) as Promise<{ status: string; amount: number; reference: string; paid_at: string; channel: string; authorization?: { bank?: string } }>;
}
export async function refund(reference: string, amountNaira?: number, note?: string) {
  return call('/refund', { method: 'POST', body: JSON.stringify({ transaction: reference, ...(amountNaira ? { amount: amountNaira * 100 } : {}), merchant_note: note?.slice(0, 200) }) });
}
export function validSignature(raw: string, sig: string | null) {
  if (!sig) return false;
  const h = crypto.createHmac('sha512', env.paystackKey).update(raw).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig)); } catch { return false; }
}
