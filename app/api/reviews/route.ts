import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireCustomer, currentCustomer } from '@/lib/customer';

export const dynamic = 'force-dynamic';
export const GET = handle(async (req: Request) => {
  const pid = new URL(req.url).searchParams.get('pid') || '';
  const c = await currentCustomer();
  const live = must(await db().from('reviews').select('id,name,stars,text,reply,created_at,customer_id').eq('product_id', pid).eq('status', 'live').order('created_at', { ascending: false }).limit(30)) as { customer_id: string }[];
  let canReview = false, mine = null;
  if (c) {
    const bought = must(await db().from('orders').select('id,items').eq('customer_id', c.id).eq('status', 'done')) as { id: string; items: { pid: string }[] }[];
    canReview = bought.some(o => o.items.some(i => i.pid === pid));
    mine = (await db().from('reviews').select('id,stars,text,status').eq('product_id', pid).eq('customer_id', c.id).maybeSingle()).data;
  }
  return ok({ reviews: live.map(({ customer_id, ...r }) => ({ ...r, mine: !!c && customer_id === c.id })), canReview, mine });
});
const Body = z.object({ pid: z.string().max(40), stars: z.number().int().min(1).max(5), text: z.string().trim().min(10, 'Write at least 10 characters.').max(400), anon: z.boolean().optional() });
export const POST = handle(async (req: Request) => {
  const c = await requireCustomer();
  const b = Body.parse(await req.json());
  const bought = must(await db().from('orders').select('id,items').eq('customer_id', c.id).eq('status', 'done')) as { id: string; items: { pid: string }[] }[];
  const order = bought.find(o => o.items.some(i => i.pid === b.pid));
  if (!order) return fail('Only customers who received this item can review it.', 403);
  const existing = (await db().from('reviews').select('id').eq('product_id', b.pid).eq('customer_id', c.id).maybeSingle()).data;
  if (existing) return fail('You’ve already reviewed this item.');
  const nm = b.anon ? 'Verified buyer' : ((c.name || 'Customer').split(' ')[0] + ((c.name || '').split(' ')[1] ? ' ' + (c.name || '').split(' ')[1][0] + '.' : ''));
  must(await db().from('reviews').insert({ product_id: b.pid, order_id: order.id, customer_id: c.id, name: nm, stars: b.stars, text: b.text }));
  return ok({ ok: true, pending: true });
});
export const DELETE = handle(async (req: Request) => {
  const c = await requireCustomer();
  const pid = new URL(req.url).searchParams.get('pid') || '';
  must(await db().from('reviews').delete().eq('product_id', pid).eq('customer_id', c.id));
  return ok({ ok: true });
});
