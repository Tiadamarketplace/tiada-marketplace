import { getStorefront } from '@/lib/storefront';
import { ShopProvider } from '@/components/shop/ShopProvider';
import Header from '@/components/shop/Header';
import Footer from '@/components/shop/Footer';
import RepackNotice from '@/components/shop/RepackNotice';
import { AddedPopup, CartDrawer, Chat, ChooseSize, Toasts } from '@/components/shop/Overlays';

// Prices and stock change often, so every page reads fresh data (cached for a minute).
export const revalidate = 60;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const data = await getStorefront();
  return (
    <ShopProvider data={data}>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <ChooseSize />
      <AddedPopup />
      <Chat />
      <Toasts />
      <RepackNotice />
    </ShopProvider>
  );
}
