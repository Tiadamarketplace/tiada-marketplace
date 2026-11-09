import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db } from '@/lib/db';

/** "Tell me when it's back" on a sold-out size. */
const Body = z.object({ pid: z.string().max(40), size: z.string().max(20), email: z.string().trim().toLowerCase().email('Enter a full email address, like name@gmail.com.').max(120) });
export const POST = handle(async (req: Request) => {
  limit('alert:' + clientIp(req), 20, 10 * 60000);
  const b = Body.parse(await req.json());
  const p = (await db().from('products').select('id').eq('id', b.pid).maybeSingle()).data;
  if (!p) return fail('That product is no longer listed.', 404);
  const { error } = await db().from('stock_alerts').upsert({ product_id: b.pid, size: b.size, email: b.email, notified_at: null }, { onConflict: 'product_id,size,email' });
  if (error) throw new Error(error.message);
  return ok({ ok: true });
});
