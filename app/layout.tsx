import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Fonts are bundled with the site (no call to Google at build or page load).
const sans = localFont({ src: './fonts/montserrat-latin-wght-normal.woff2', weight: '100 900', variable: '--font-montserrat', display: 'swap' });
const serif = localFont({ src: [{ path: './fonts/playfair-display-latin-500-italic.woff2', weight: '500', style: 'italic' }, { path: './fonts/playfair-display-latin-600-italic.woff2', weight: '600', style: 'italic' }], variable: '--font-playfair', display: 'swap' });

const site = (process.env.SITE_URL || 'https://tiadamarketplace.com').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Tiada Marketplace · Foodstuffs and cereals in Lagos', template: '%s · Tiada Marketplace' },
  description: 'Your trusted plug for quality foodstuff, cereals, groceries and everyday kitchen essentials. Sized for your home and delivered across Lagos.',
  openGraph: { type: 'website', siteName: 'Tiada Marketplace', images: [{ url: '/img/og.jpg', width: 1200, height: 675 }] },
  icons: { icon: '/icon-sm.png', apple: '/logo-icon.png' },
};
export const viewport: Viewport = { themeColor: '#0B3A23', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
