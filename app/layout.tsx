import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Fonts are bundled with the site (no call to Google at build or page load).
const sans = localFont({ src: './fonts/montserrat-latin-wght-normal.woff2', weight: '100 900', variable: '--font-montserrat', display: 'swap' });
const serif = localFont({ src: [{ path: './fonts/playfair-display-latin-500-italic.woff2', weight: '500', style: 'italic' }, { path: './fonts/playfair-display-latin-600-italic.woff2', weight: '600', style: 'italic' }], variable: '--font-playfair', display: 'swap' });

const site = (process.env.SITE_URL || 'https://tiadamarketplace.com').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Tiada Marketplace · Foodstuffs and cereals in Lagos and Oyo', template: '%s · Tiada Marketplace' },
  description: 'Your trusted plug for quality foodstuff, cereals, groceries and everyday kitchen essentials. Sized for your home and delivered in Lagos and Oyo State.',
  // the picture shown when the link is shared on WhatsApp, Facebook, X and in messages
  openGraph: { type: 'website', siteName: 'Tiada Marketplace', images: [{ url: '/img/share.jpg', width: 1200, height: 630, alt: 'Tiada Marketplace: foodstuffs and cereals, packed for your home' }] },
  twitter: { card: 'summary_large_image', images: ['/img/share.jpg'] },
  // tab icon and phone home-screen icon: just the Tiada bag, clean at small sizes
  icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icon.png', type: 'image/png', sizes: '64x64' }], apple: '/apple-icon.png' },
};
export const viewport: Viewport = { themeColor: '#0B3A23', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
