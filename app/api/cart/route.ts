import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { currentCustomer } from '@/lib/customer';
import { saveCart, cartByToken, maybeSweep } from '@/lib/carts';

export const dynamic = 'force-dynamic';

const Line = z.object({ key: z.string().max(200), pid: z.string().max(80), size: z.string().max(60), qty: z.number().int().min(1).max(999), swaps: z.array(z.object({ from: z.string().max(80), to: z.string().max(80) })).max(30).optional() });
const Body = z.object({ items: z.array(Line).max(80), email: z.string().trim().email().max(200).optional(), name: z.string().trim().max(120).optional() });

/** Keep a copy of the cart for the reminder email: the signed-in customer's, or the email typed at checkout. */
export const POST = handle(async (req: Request) => {
  limit('cart:' + clientIp(req), 60, 10 * 60000);
  const b = Body.parse(await req.json());
  const me = await currentCustomer();
  const email = me?.email || b.email;
  if (email) await saveCart(email, me?.name || b.name || null, b.items);
  maybeSweep();
  return ok({ saved: !!email });
});

/** The link in the reminder email: hands the saved items back to the browser. */
export const GET = handle(async (req: Request) => {
  limit('cartget:' + clientIp(req), 30, 10 * 60000);
  const t = new URL(req.url).searchParams.get('t') || '';
  if (!/^[a-f0-9]{24}$/.test(t)) return fail('Not found.', 404);
  const c = await cartByToken(t);
  if (!c) return fail('This cart has expired.', 404);
  return ok({ items: c.items });
});
