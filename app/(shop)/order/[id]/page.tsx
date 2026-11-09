import type { Metadata } from 'next';
import OrderResult from '@/components/shop/pages/OrderResult';
export const metadata: Metadata = { title: 'Your order', robots: { index: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ref?: string; cancelled?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  return <OrderResult id={id} payRef={sp.ref || ''} cancelled={sp.cancelled === '1'} />;
}
