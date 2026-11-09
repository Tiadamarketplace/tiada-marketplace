import type { Metadata } from 'next';
import Account from '@/components/shop/pages/Account';
export const metadata: Metadata = { title: 'My account', robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <Account next={next && next.startsWith('/') && !next.startsWith('//') ? next : ''} />;
}
