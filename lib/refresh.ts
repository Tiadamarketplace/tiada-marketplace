import { revalidatePath } from 'next/cache';
/** After the admin changes products, banners or settings, rebuild the shop pages on their next visit. */
export function refreshShop() { try { revalidatePath('/', 'layout'); } catch (e) { console.error('revalidate', e); } }
