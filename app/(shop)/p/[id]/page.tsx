import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStorefront } from '@/lib/storefront';
import ProductPage from '@/components/shop/pages/Product';
import { aisleLabel, minPrice, naira } from '@/lib/shop-client';

export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = (await getStorefront()).products.find(x => x.id === id);
  if (!p) return { title: 'Not found' };
  const d = `${p.name} from ${naira(minPrice(p))} at Tiada Marketplace. ${aisleLabel(p.cat)}, packed fresh and delivered across Lagos.`;
  return { title: p.name, description: d, alternates: { canonical: '/p/' + p.id }, openGraph: { title: p.name, description: d, images: p.img ? [{ url: p.img }] : undefined } };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getStorefront();
  const p = s.products.find(x => x.id === id);
  if (!p) notFound();
  const site = (process.env.SITE_URL || 'https://tiadamarketplace.com').replace(/\/$/, '');
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: p.img ? site + p.img : undefined, brand: 'Tiada Marketplace',
    offers: { '@type': 'AggregateOffer', priceCurrency: 'NGN', lowPrice: minPrice(p), offerCount: p.sizes.filter(z => !z.na).length, availability: p.status === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
    aggregateRating: p.rating ? { '@type': 'AggregateRating', ratingValue: p.rating.avg, reviewCount: p.rating.n } : undefined,
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    <ProductPage id={p.id} />
  </>;
}
