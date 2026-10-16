import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { getProducts, getZones, getSetting, DEFAULT_FEES } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
const shortName = (n: string) => { const w = String(n || '').trim().split(/\s+/); return w.length > 1 ? `${w[0]} ${w[w.length - 1][0]}.` : (w[0] || 'Customer'); };
export const GET = handle(async () => {
  const [products, zones, fees, layout, tiles, aisles, store, promos, ratings, topReviews] = await Promise.all([
    getProducts(), getZones(), getSetting('fees', DEFAULT_FEES), getSetting('layout', []), getSetting('tiles', {}), getSetting('aisles', {}), getSetting('store', {}),
    db().from('promos').select('id,title,eyebrow,text,product_id,img,cls,ends_at').eq('is_on', true).gt('ends_at', new Date().toISOString()).order('created_at'),
    db().from('reviews').select('product_id,stars').eq('status', 'live'),
    db().from('reviews').select('name,stars,text,product_id,created_at').eq('status', 'live').gte('stars', 4).order('created_at', { ascending: false }).limit(12),
  ]);
  const agg: Record<string, { n: number; sum: number }> = {};
  for (const r of (must(ratings) as { product_id: string; stars: number }[])) { const a = (agg[r.product_id] ||= { n: 0, sum: 0 }); a.n++; a.sum += r.stars; }
  return ok({
    products: products.map(p => ({ ...p, stock: p.stock < 5 ? p.stock : 99, rating: agg[p.id] ? { n: agg[p.id].n, avg: agg[p.id].sum / agg[p.id].n } : null })),
    zones, fees: { min: fees.min, lagosKg: fees.lagosKg, interKg: fees.interKg, van: fees.van, same: fees.same, express: fees.express, eco: fees.eco },
    layout, tiles, aisles, store, promos: must(promos),
    // recent 4–5 star reviews for the homepage belt: first name + last initial only
    reviews: ((topReviews.data || []) as { name: string; stars: number; text: string; product_id: string; created_at: string }[]).map(r => ({ name: shortName(r.name), stars: r.stars, text: r.text.slice(0, 220), product_id: r.product_id, at: r.created_at })),
    now: Date.now(),
  }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
});
