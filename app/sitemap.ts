import type { MetadataRoute } from 'next';
import { getStorefront } from '@/lib/storefront';
import { AISLE_COPY } from '@/lib/aisles';
const site = (process.env.SITE_URL || 'https://tiadamarketplace.com').replace(/\/$/, '');
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await getStorefront().catch(() => null);
  return [
    { url: site + '/', priority: 1 },
    ...Object.keys(AISLE_COPY).map(a => ({ url: `${site}/aisle/${a}`, priority: 0.8 })),
    ...(s?.products || []).map(p => ({ url: `${site}/p/${p.id}`, priority: 0.7 })),
    ...['/help', '/track', '/privacy', '/terms'].map(u => ({ url: site + u, priority: 0.3 })),
  ];
}
