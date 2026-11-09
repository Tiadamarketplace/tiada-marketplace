import type { Metadata } from 'next';
import Help from '@/components/shop/pages/Help';
export const metadata: Metadata = { title: 'Help and delivery', description: 'How ordering, paying, delivery days and combo swaps work at Tiada Marketplace.' };
export default function Page() { return <Help />; }
