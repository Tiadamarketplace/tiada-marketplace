import type { Metadata } from 'next';
import Policy from '@/components/shop/pages/Policy';
export const metadata: Metadata = { title: 'Privacy policy' };
export default function Page() { return <Policy kind="privacy" />; }
