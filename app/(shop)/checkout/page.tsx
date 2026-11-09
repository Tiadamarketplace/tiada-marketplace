import type { Metadata } from 'next';
import Checkout from '@/components/shop/pages/Checkout';
export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };
export default function Page() { return <Checkout />; }
