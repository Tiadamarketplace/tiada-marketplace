import type { Metadata } from 'next';
import Track from '@/components/shop/pages/Track';
export const metadata: Metadata = { title: 'Track your order', description: 'Check where your Tiada order is with your TD code.' };
export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <Track initial={(code || '').slice(0, 12)} />;
}
