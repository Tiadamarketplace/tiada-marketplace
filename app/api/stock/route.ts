import { handle, ok, limit, clientIp } from '@/lib/http';
import { getStorefront } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

/** Checked when someone taps Add to cart: is this size still in stock right now? */
export const GET = handle(async (req: Request) => {
  limit('stock:' + clientIp(req), 120, 60000);
  const u = new URL(req.url); const pid = u.searchParams.get('pid') || ''; const size = u.searchParams.get('size') || '';
  const p = (await getStorefront()).products.find(x => x.id === pid);
  const s = p?.sizes.find(x => x.label === size);
  const inStock = !!p && !!s && p.status !== 'out' && p.status !== 'na' && !s.na && s.left !== 0;
  return ok({ ok: inStock, left: s?.left ?? null });
});
