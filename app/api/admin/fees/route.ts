import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';
import { getSetting, setSetting, DEFAULT_FEES, Fees } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
const N = z.number().int().min(0).max(1_000_000);
const Body = z.object({
  min: N, lagosKg: N, interKg: N, van: N, same: N, express: N, eco: N.optional(),
  areas: z.array(z.object({ id: z.string().max(20), fee: N })).max(30),
  regions: z.record(z.enum(['sw', 'ss', 'nc', 'nw']), N),
});

/** Saves delivery fees. Lagos areas are stored per zone; each other-state region fee is copied to its states. */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'store');
  const b = Body.parse(await req.json());
  const old = await getSetting<Fees>('fees', DEFAULT_FEES);
  const regions = { ...(old.regions || {}) };
  for (const [k, fee] of Object.entries(b.regions)) regions[k] = { ...(regions[k] || { days: '' }), fee };
  await setSetting('fees', { ...old, min: b.min, lagosKg: b.lagosKg, interKg: b.interKg, van: b.van, same: b.same, express: b.express, eco: b.eco ?? old.eco, regions });
  for (const a of b.areas) must(await db().from('zones').update({ fee: a.fee }).eq('id', a.id).is('state', null));
  for (const [k, fee] of Object.entries(b.regions)) must(await db().from('zones').update({ fee }).eq('region', k));
  await logAct(me.name, 'Updated delivery fees');
  return ok({ ok: true });
});
