import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Collection from '@/components/shop/pages/Collection';
import { AISLE_COPY } from '@/lib/aisles';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const c = AISLE_COPY[slug];
  return c ? { title: c[0], description: c[1], alternates: { canonical: '/aisle/' + slug } } : {};
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!AISLE_COPY[slug]) notFound();
  return <Collection aisle={slug} />;
}
