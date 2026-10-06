import { validSignature, verify } from '@/lib/paystack';
import { markPaid } from '@/lib/orders';
import { db } from '@/lib/db';

/** Paystack calls this the moment a transfer lands. We check the signature, then double-check with Paystack. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-paystack-signature'))) return new Response('bad signature', { status: 401 });
  try {
    const ev = JSON.parse(raw);
    if (ev.event === 'charge.success') {
      const ref = ev.data?.reference as string;
      const t = await verify(ref);
      if (t.status === 'success') {
        const o = (await db().from('orders').select('id').eq('pay_ref', ref).maybeSingle()).data;
        if (o) await markPaid(o.id, t.amount, t.paid_at);
      }
    }
  } catch (e) {
    console.error('webhook', e);
    return new Response('retry', { status: 500 }); // Paystack retries; markPaid is safe to run twice
  }
  return new Response('ok');
}
