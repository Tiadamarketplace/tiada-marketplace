// Helpers shared by the shop's browser code. No server imports here.
import type { PubProduct, PubSize } from './storefront';

export const naira = (n: number) => '₦' + Math.round(n || 0).toLocaleString('en-NG');

export const AISLES: { id: string; label: string; lower: string; blurb: string; img: string }[] = [
  { id: 'cereal', label: 'Breakfast Cereals', lower: 'breakfast cereals', blurb: 'Cornflakes, Coco Pops, Golden Morn and more, repacked fresh from bulk into the size you need.', img: '/img/p/cornflakes.jpg' },
  { id: 'milk', label: 'Milk & Beverages', lower: 'milk and beverages', blurb: 'Powdered milk, Milo and malt drinks by weight, from 250g to a paint bucket.', img: '/img/p/milo.jpg' },
  { id: 'grain', label: 'Oats & Custard', lower: 'oats and custard', blurb: 'Oats, granola and custard for warm, filling breakfasts.', img: '/img/p/oat.jpg' },
  { id: 'food', label: 'Foodstuffs', lower: 'foodstuffs', blurb: 'Rice, beans, garri, semo, pasta and oils for everyday cooking. Bigger sizes cost less per kilo.', img: '/img/p/rice.jpg' },
  { id: 'ccombo', label: 'Cereal Combos', lower: 'cereal combos', blurb: 'Ready-made breakfast boxes. Swap anything you don’t want and the price stays the same.', img: '/img/p/cc1.jpg' },
  { id: 'fcombo', label: 'Foodstuff Combos', lower: 'foodstuff combos', blurb: 'Pantry packs for students and families, from ₦5,000. Swap any item.', img: '/img/p/foodcombo.jpg' },
];
export const aisleLabel = (id: string) => AISLES.find(a => a.id === id)?.label || (id === 'deals' ? 'On Sale' : id === 'all' ? 'All products' : 'Shop');
export const isCombo = (p: Pick<PubProduct, 'cat'>) => p.cat === 'ccombo' || p.cat === 'fcombo';

export const nowPrice = (s: PubSize) => (s.sale && s.price && s.sale < s.price ? s.sale : s.price || 0);
export const sellable = (p: PubProduct) => p.sizes.filter(s => !s.na && s.price != null);
export const inStock = (p: PubProduct, s: PubSize) => p.status !== 'out' && p.status !== 'na' && !s.na && s.left !== 0;
export const minPrice = (p: PubProduct) => Math.min(...sellable(p).map(nowPrice), Infinity);
export const maxOff = (p: PubProduct) => Math.max(0, ...sellable(p).map(s => (s.sale && s.price ? Math.round((1 - s.sale / s.price) * 100) : 0)));
export const isSoldOut = (p: PubProduct) => p.status === 'out' || p.status === 'na' || !sellable(p).some(s => inStock(p, s));
export const lowLeft = (p: PubProduct) => { const l = sellable(p).map(s => s.left).filter((x): x is number => x != null && x > 0); return l.length ? Math.min(...l) : null; };

/** Size to show first: a size on sale that's in stock, else 500g-ish, else the first in stock. */
export function defaultSize(p: PubProduct): number {
  const ok = (i: number) => { const s = p.sizes[i]; return !!s && !s.na && s.price != null && inStock(p, s); };
  const sale = p.sizes.findIndex((s, i) => ok(i) && s.sale && s.price && s.sale < s.price);
  if (sale >= 0) return sale;
  const order = [1, 0, 2, 3, 4, 5].find(ok);
  if (order != null) return order;
  const any = p.sizes.findIndex(s => !s.na && s.price != null);
  return any >= 0 ? any : 0;
}

export type CartLine = { key: string; pid: string; size: string; qty: number; swaps?: { from: string; to: string }[] };
export const lineKey = (pid: string, size: string, swaps?: { from: string; to: string }[]) => pid + '|' + size + (swaps?.length ? '|' + swaps.map(w => w.from + '>' + w.to).join(',') : '');

export const SWAP_CEREAL = ['Cornflakes', 'Coco Pops', 'Frosties', 'Moon and Star', 'Golden Morn', 'Fruit and Fiber', 'Oat', 'Custard', 'Milo', 'Choco Malt', 'Lactorich milk', 'Dano milk', 'Peak milk', 'Sugar'];
export const SWAP_FOOD = ['Rice', 'Spaghetti', 'Noodles', 'Garri', 'Beans', 'Semo', 'Veg oil', 'Palm oil', 'Sugar', 'Tin tomatoes', 'Seasoning cubes', 'Junks/beverages'];

/** "Lagos and Oyo", from the zones the shop delivers to. */
export function whereWeDeliver(zones: { state: string | null }[]) {
  const st = Array.from(new Set(zones.map(z => z.state).filter((x): x is string => !!x)));
  const all = ['Lagos', ...st];
  return all.length === 1 ? all[0] : all.slice(0, -1).join(', ') + ' and ' + all[all.length - 1];
}
export const waLink = (num: string, text?: string) => `https://wa.me/${(num || '2348075110000').replace(/\D/g, '')}${text ? '?text=' + encodeURIComponent(text) : ''}`;

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(url, { ...init, method: init?.method || (init?.json !== undefined ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j as { error?: string }).error || 'Something went wrong on our side. Please try again.'), { status: r.status });
  return j as T;
}
