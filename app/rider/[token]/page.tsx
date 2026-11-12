import type { Metadata } from 'next';
import RiderApp from '@/components/rider/RiderApp';

export const metadata: Metadata = { title: 'Tiada rider', robots: { index: false, follow: false }, referrer: 'no-referrer' };

/** A rider's private page. The link itself is the key, so it's never indexed or shared onwards. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RiderApp token={token} />;
}
