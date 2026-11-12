import type { MetadataRoute } from 'next';
const site = (process.env.SITE_URL || 'https://tiadamarketplace.com').replace(/\/$/, '');
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/checkout', '/account', '/order/', '/cart', '/rider/'] }], sitemap: site + '/sitemap.xml' };
}
