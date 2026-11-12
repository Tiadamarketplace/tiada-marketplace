import { HERO_DEFAULT, liveSlides, type HeroSettings } from './hero-core';
import { livePopups, type PubPopup } from './popups';
import { cache } from 'react';
import { db, must } from './db';
import { regions, RegionName } from './regions';
import { getProducts, getSetting, DEFAULT_FEES, Fees, Product } from './catalog';
import { photoFor } from './photos';

/** Shapes shared by the server and the shop's browser code. */
export type PubSize = { label: string; price: number | null; sale: number | null; kg: number; na: boolean; left: number | null };
export type PubProduct = { id: string; name: string; cat: string; items: string[] | null; sizes: PubSize[]; status: string; img: string | null; rating: { n: number; avg: number } | null };
export type Slide = { id: string; kicker: string; title: string; text: string; button: string; img: string | null; style: 'photo' | 'color' | 'image'; color: string; shade: number; href: string };
export type Business = { name: string; tagline: string; address: string; phone: string; whatsapp: string; email: string; tiktok: string };
export type Storefront = {
  products: PubProduct[];
  /** The states we deliver to, with the lowest and highest fee. Fees depend on the address, worked out at checkout. */
  zones: { id: string; label: string; fee: number; max: number; day: string | null; state: string | null; region: string | null; days: string | null; city?: string | null }[];
  fees: Pick<Fees, 'min' | 'lagosKg' | 'interKg' | 'van' | 'same' | 'express' | 'eco'>;
  slides: Slide[]; slider: { on: boolean; seconds: number };
  business: Business; policies: { returns: string; delivery: string };
  reviews: { name: string; stars: number; text: string; product_id: string }[];
  popups?: PubPopup[];
  hero?: HeroSettings;
};

export const DEFAULT_BUSINESS: Business = {
  name: 'Tiada Marketplace', tagline: 'Your trusted plug', address: '27, Finance Road, Maplewood Estate, Agege, Lagos State',
  phone: '0807 511 0000', whatsapp: '2348075110000', email: 'tiadamarketplace0@gmail.com', tiktok: 'tiadamarketplace',
};

/** How much of a size is left, as the shop may show it: exact when 5 or fewer, otherwise "plenty" (null). */
export function sizeLeft(s: { stock?: number | null; na?: boolean }, p: Pick<Product, 'status'>): number | null {
  if (s.na || p.status === 'out' || p.status === 'na') return 0;
  if (s.stock == null) return null;
  return s.stock <= 5 ? Math.max(0, s.stock) : null;
}

const shortName = (n: string) => { const w = String(n || '').trim().split(/\s+/); return w.length > 1 ? `${w[0]} ${w[w.length - 1][0]}.` : (w[0] || 'Customer'); };

function slideHref(t: string | null, to: string | null): string {
  if (t === 'product' && to) return `/p/${encodeURIComponent(to)}`;
  if (t === 'aisle' && to) return `/aisle/${encodeURIComponent(to)}`;
  if (t === 'deals') return '/aisle/deals';
  if (t === 'url' && to && /^https?:\/\//.test(to)) return to;
  return '/aisle/all';
}

/** Everything the shop pages need, loaded once per request. */
export const getStorefront = cache(loadStorefront);
async function loadStorefront(): Promise<Storefront> {
  // Local preview without a database: TIADA_MOCK points at a JSON file shaped like Storefront.
  if (process.env.TIADA_MOCK && (process.env.NODE_ENV !== 'production' || process.env.TIADA_MOCK_BUILD === '1')) {
    const fs = await import('fs');
    const m = JSON.parse(fs.readFileSync(process.env.TIADA_MOCK, 'utf8')) as Storefront;
    return { ...m, products: m.products.map(p => ({ ...p, img: photoFor(p.id, p.img, p.cat) })) };
  }
  const nowIso = new Date().toISOString();
  const [products, zones, fees, business, policies, slider, promos, ratings, top, popups, hero] = await Promise.all([
    getProducts(), regions(), getSetting<Fees>('fees', DEFAULT_FEES), getSetting<Partial<Business>>('business', {}),
    getSetting('policies', { returns: '', delivery: '' }), getSetting('slider', { on: true, seconds: 6 }),
    db().from('promos').select('*').eq('is_on', true).gt('ends_at', nowIso).lte('starts_at', nowIso).order('sort').order('created_at'),
    db().from('reviews').select('product_id,stars').eq('status', 'live'),
    db().from('reviews').select('name,stars,text,product_id').eq('status', 'live').gte('stars', 4).order('created_at', { ascending: false }).limit(12),
    livePopups(),
    getSetting<HeroSettings>('hero', HERO_DEFAULT),
  ]);
  const agg: Record<string, { n: number; sum: number }> = {};
  for (const r of (must(ratings) as { product_id: string; stars: number }[])) { const a = (agg[r.product_id] ||= { n: 0, sum: 0 }); a.n++; a.sum += r.stars; }
  type PromoRow = { id: string; title: string; eyebrow: string | null; text: string | null; img: string | null; style: string | null; color: string | null; shade: number | null; button: string | null; link_type: string | null; link_to: string | null; product_id: string | null };
  const slides: Slide[] = ((promos.data || []) as PromoRow[]).map(p => ({
    id: p.id, kicker: p.eyebrow || '', title: p.title, text: p.text || '', button: p.button || 'Shop now', img: p.img,
    style: (p.style === 'color' || p.style === 'image' ? p.style : 'photo'), color: p.color || '#0B3A23', shade: Number(p.shade ?? 0.85),
    href: slideHref(p.link_type || (p.product_id ? 'product' : null), p.link_to || p.product_id),
  }));
  return {
    products: products.map(p => ({
      id: p.id, name: p.name, cat: p.cat, items: p.items, status: p.status, img: photoFor(p.id, p.img, p.cat),
      sizes: (p.sizes as (Product['sizes'][number] & { stock?: number | null })[]).map(s => ({ label: s.label, price: s.price, sale: s.sale, kg: s.kg, na: !!s.na || s.price == null, left: sizeLeft(s, p) })),
      rating: agg[p.id] ? { n: agg[p.id].n, avg: Math.round(agg[p.id].sum / agg[p.id].n * 10) / 10 } : null,
    })),
    zones: (Object.entries(zones) as [RegionName, NonNullable<(typeof zones)[RegionName]>][]).map(([r, c]) => ({ id: 'st:' + r, label: r, fee: c.start, max: c.max, day: null, state: r, region: 'sw', days: c.days, city: null })),
    fees: { min: fees.min, lagosKg: fees.lagosKg, interKg: fees.interKg, van: fees.van, same: fees.same, express: fees.express, eco: fees.eco },
    slides, slider: { on: slider.on !== false, seconds: Math.min(10, Math.max(3, Number(slider.seconds) || 6)) },
    business: { ...DEFAULT_BUSINESS, ...business }, policies: { returns: policies.returns || '', delivery: policies.delivery || '' },
    popups,
    hero: { ...HERO_DEFAULT, ...hero, slides: liveSlides({ ...HERO_DEFAULT, ...hero }) },
    reviews: ((top.data || []) as { name: string; stars: number; text: string; product_id: string }[]).map(r => ({ name: shortName(r.name), stars: r.stars, text: r.text.slice(0, 220), product_id: r.product_id })),
  };
}
