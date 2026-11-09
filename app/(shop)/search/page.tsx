import type { Metadata } from 'next';
import Collection from '@/components/shop/pages/Collection';
export const metadata: Metadata = { title: 'Search', robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <Collection aisle="all" q={(q || '').slice(0, 80)} />;
}
