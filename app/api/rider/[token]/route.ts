import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { riderByToken } from '@/lib/riders';
import { logAct } from '@/lib/staff';
import { notifyOrder, alertAdmin, Order } from '@/lib/notify';
import { esc, naira } from '@/lib/email';

export const dynamic = 'force-dynamic';
type O = Order & { paid?: number | null; drop_code?: string | null; updated_at: string; confirm?: Record<string, unknown> | null };
const mapLink = (s: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
const today = () => new Date(Date.now() + 3600_000).toISOString().slice(0, 10); // Lagos time (UTC+1)

/** The rider's page: their drops on the way, and what they delivered today. Only what a rider needs. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  limit('rider:' + clientIp(req), 120, 10 * 60000);
  const r = await riderByToken(token);
  const [onWay, done] = await Promise.all([
    db().from('orders').select('*').eq('status', 'route').eq('rider->>rider_id', r.id).order('updated_at'),
    db().from('orders').select('id,name,area_label,confirm,updated_at').eq('status', 'done').eq('rider->>rider_id', r.id).gte('updated_at', today() + 'T00:00:00+01:00').order('updated_at', { ascending: false }),
  ]);
  const drops = (must(onWay) as O[]).map(o => ({
    id: o.id, name: o.name, phone: o.phone, address: o.address, landmark: o.landmark, area: o.area_label, note: o.note,
    items: o.items.map(it => `${it.qty} × ${it.name}${it.size !== 'Package' ? ' ' + it.size : ''}`), kg: o.kg,
    map: o.spot ? mapLink(o.spot as { lat: number; lng: number }) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address + ', ' + (o.area_label || ''))}`,
    collect: o.paid != null && o.total > o.paid ? o.total - o.paid : 0, needsCode: !!o.drop_code,
  }));
  return ok({ rider: { name: r.name }, drops, done: must(done) });
});

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('deliver'), id: z.string().max(20), code: z.string().trim().max(8).optional() }),
  z.object({ action: z.literal('problem'), id: z.string().max(20), reason: z.string().trim().min(2).max(120), note: z.string().trim().max(300).optional() }),
]);

export const POST = handle(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  const r = await riderByToken(token);
  const b = Body.parse(await req.json());
  const o = must(await db().from('orders').select('*').eq('id', b.id).maybeSingle()) as O | null;
  if (!o || (o.rider as { rider_id?: string } | null)?.rider_id !== r.id) return fail('This order isn’t on your list.', 404);
  if (o.status !== 'route') return fail(o.status === 'done' ? 'This order is already marked delivered.' : 'This order isn’t out for delivery any more. Call the office.');

  if (b.action === 'problem') {
    limit('rprob:' + r.id, 20, 60 * 60000);
    await alertAdmin(`Rider problem on ${o.id}`, `<p><strong>${esc(r.name)}</strong> can’t deliver <strong>${o.id}</strong> to ${esc(o.name)} (${esc(o.area_label || '')}).</p><p><strong>${esc(b.reason)}</strong>${b.note ? '<br>' + esc(b.note) : ''}</p><p>Call the customer on ${esc(o.phone)} and let the rider know what to do.</p>`).catch(e => console.error('rider problem email', e));
    await logAct(`Rider ${r.name}`, `Couldn’t deliver ${o.id}: ${b.reason}`);
    return ok({ told: true });
  }

  // a few wrong tries per order, so a code can't be guessed
  limit('rcode:' + o.id, 5, 30 * 60000);
  if (o.drop_code && (b.code || '').replace(/\D/g, '') !== o.drop_code) return fail('That code isn’t right. Ask the customer to check the email from Tiada. After 5 wrong tries, call the office.');
  const now = new Date().toISOString();
  const upd = must(await db().from('orders').update({ status: 'done', updated_at: now, confirm: { how: o.drop_code ? 'Rider confirmed with the customer’s code' : 'Rider marked delivered', note: '', by: r.name, at: now, rider_id: r.id } })
    .eq('id', o.id).eq('status', 'route').select('*')) as O[];
  if (!upd.length) return fail('Someone just changed this order. Refresh the page.', 409);
  await notifyOrder(upd[0], 'done').catch(e => console.error('done email', e));
  await logAct(`Rider ${r.name}`, `Delivered ${o.id}${o.drop_code ? ' (code checked)' : ''}${o.paid != null && o.total > o.paid ? ' · collect ' + naira(o.total - o.paid) : ''}`);
  return ok({ delivered: true });
});
