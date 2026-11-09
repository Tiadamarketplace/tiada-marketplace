import type { Metadata } from 'next';
import Unsubscribe from '@/components/shop/pages/Unsubscribe';
export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string; t?: string }> }) {
  const sp = await searchParams;
  return <Unsubscribe email={sp.email || ''} token={sp.t || ''} />;
}
