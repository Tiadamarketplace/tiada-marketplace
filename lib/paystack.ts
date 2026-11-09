import crypto from 'crypto';
import { env } from './env';

const API = 'https://api.paystack.co';
async function call(path: string, init?: RequestInit) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${env.paystackKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status === false) throw new Error(`Paystack: ${j.message || r.status}`);
  return j.data;
}

/** Start a payment. The shop opens Paystack's own secure window with the access code it returns. */
export async function initialize(o: { email: string; amountNaira: number; reference: string; orderId: string; callbackUrl: string }) {
  const d = await call('/transaction/initialize', { method: 'POST', body: JSON.stringify({
    email: o.email, amount: o.amountNaira * 100, reference: o.reference, currency: 'NGN', callback_url: o.callbackUrl,
    channels: ['card', 'bank_transfer', 'ussd', 'bank'],
    metadata: { order_id: o.orderId, cancel_action: o.callbackUrl + '&cancelled=1' },
  }) });
  return { access_code: d.access_code as string, authorization_url: d.authorization_url as string };
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
