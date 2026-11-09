import { db, must } from '@/lib/db';
import { ownerDaily, ownerLowStock, notPaid, Order } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Runs every evening (8pm Lagos) from Vercel Cron: day summary, low stock, and "your order wasn't paid" nudges. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('forbidden', { status: 403 });
  const out: Record<string, unknown> = {};
  const now = Date.now();
  const lagosMidnight = new Date(new Date(now + 3600e3).toISOString().slice(0, 10) + 'T00:00:00+01:00').toISOString();

  // 1. orders left unpaid for over an hour: mark expired and send one friendly nudge
  try {
    const stale = must(await db().from('orders').select('*').eq('status', 'pending').lt('created_at', new Date(now - 3600e3).toISOString()).gt('created_at', new Date(now - 3 * 864e5).toISOString()).limit(100)) as Order[];
    const seen = new Set<string>(); let nudged = 0;
    for (const o of stale) {
      await db().from('orders').update({ status: 'expired' }).eq('id', o.id).eq('status', 'pending');
      // only one nudge per person, and not if they went on to pay for another order
      if (seen.has(o.email)) continue; seen.add(o.email);
      const paidSince = (await db().from('orders').select('id', { count: 'exact', head: true }).ilike('email', o.email).gt('created_at', o.created_at).not('status', 'in', '(pending,expired)')).count || 0;
      if (!paidSince) { await notPaid(o); nudged++; }
    }
    out.expired = stale.length; out.nudged = nudged;
  } catch (e) { out.expiredError = (e as Error).message; }

  // 2. low stock
  const low: { name: string; meta: string; waiting: number }[] = [];
  try {
    const prods = must(await db().from('products').select('id,name,status,sizes,hidden').eq('hidden', false)) as { id: string; name: string; status: string; sizes: { label: string; na?: boolean; price: number | null; stock?: number | null }[] }[];
    const alerts = must(await db().from('stock_alerts').select('product_id,size').is('notified_at', null)) as { product_id: string; size: string }[];
    for (const p of prods) for (const s of p.sizes) {
      if (s.na || s.price == null || s.stock == null || s.stock > 3) continue;
      const waiting = alerts.filter(a => a.product_id === p.id && a.size === s.label).length;
      low.push({ name: p.name, meta: `${s.label === 'Package' ? '' : s.label + ' · '}${s.stock <= 0 ? 'sold out' : s.stock + ' left'}`, waiting });
    }
    if (low.length) await ownerLowStock(low.sort((a, b) => b.waiting - a.waiting).slice(0, 25));
    out.low = low.length;
  } catch (e) { out.lowError = (e as Error).message; }

  // 3. the day in one email
  try {
    const today = must(await db().from('orders').select('total,status').gte('paid_at', lagosMidnight)) as { total: number; status: string }[];
    const toPack = (await db().from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new')).count || 0;
    const reviews = (await db().from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending')).count || 0;
    const date = new Date(now + 3600e3).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    await ownerDaily({ date, total: today.reduce((a, o) => a + o.total, 0), orders: today.length, toPack, reviews, chats: 0, low: low.map(l => l.name).slice(0, 6) });
    out.daily = today.length;
  } catch (e) { out.dailyError = (e as Error).message; }
  return Response.json(out);
}
