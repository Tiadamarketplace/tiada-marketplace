import type { Metadata } from 'next';
import Policy from '@/components/shop/pages/Policy';
export const metadata: Metadata = { title: 'Terms of sale' };
export default function Page() { return <Policy kind="terms" />; }
