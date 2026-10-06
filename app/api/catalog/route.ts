import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { getProducts, getZones, getSetting, DEFAULT_FEES } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const GET = handle(async () => {
  const [products, zones, fees, layout, tiles, aisles, store, promos, ratings] = await Promise.all([
    getProducts(), getZones(), getSetting('fees', DEFAULT_FEES), getSetting('layout', []), getSetting('tiles', {}), getSetting('aisles', {}), getSetting('store', {}),
    db().from('promos').select('id,title,eyebrow,text,product_id,img,cls,ends_at').eq('is_on', true).gt('ends_at', new Date().toISOString()).order('created_at'),
    db().from('reviews').select('product_id,stars').eq('status', 'live'),
  ]);
  const agg: Record<string, { n: number; sum: number }> = {};
  for (const r of (must(ratings) as { product_id: string; stars: number }[])) { const a = (agg[r.product_id] ||= { n: 0, sum: 0 }); a.n++; a.sum += r.stars; }
  return ok({
    products: products.map(p => ({ ...p, stock: p.stock < 5 ? p.stock : 99, rating: agg[p.id] ? { n: agg[p.id].n, avg: agg[p.id].sum / agg[p.id].n } : null })),
    zones, fees: { min: fees.min, lagosKg: fees.lagosKg, interKg: fees.interKg, van: fees.van, same: fees.same, express: fees.express, eco: fees.eco },
    layout, tiles, aisles, store, promos: must(promos), now: Date.now(),
  }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
});
