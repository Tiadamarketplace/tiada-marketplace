import { z } from 'zod';
import { handle, ok, limit, clientIp } from '@/lib/http';
import { resolve, suggest } from '@/lib/geo';
import { quoteSpot, regions } from '@/lib/regions';
import { Place } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

/** Address suggestions while the customer types. */
export const GET = handle(async (req: Request) => {
  limit('places:' + clientIp(req), 300, 10 * 60000);
  const u = new URL(req.url);
  const list = await suggest(u.searchParams.get('q') || '', (u.searchParams.get('s') || '').slice(0, 80));
  return ok({ list });
});

/** The customer picked a suggestion: say whether we deliver there, and for how much. The pin itself is never sent back. */
export const POST = handle(async (req: Request) => {
  limit('pick:' + clientIp(req), 120, 10 * 60000);
  const p = Place.parse(await req.json());
  const spot = await resolve({ id: p.id, lat: p.lat, lng: p.lng, session: p.s });
  if (!spot) return ok({ ok: false, reason: 'We couldn’t find that address on the map. Try typing it a little differently, then pick it from the list.' });
  const q = quoteSpot(spot, await regions());
  return ok(q.ok ? { ok: true, label: spot.label, state: q.region, fee: q.fee, days: q.days } : { ok: false, label: spot.label, reason: q.reason });
});
