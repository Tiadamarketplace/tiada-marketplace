import type { Metadata } from 'next';
import CartPage from '@/components/shop/pages/Cart';
export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };
export default function Page() { return <CartPage />; }
