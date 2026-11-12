import { db } from './db';

/** Pop-up banners: a picture (and optional words) shown once over the shop, for a sale or news. Managed in Admin → Pop-ups. */
export type Popup = {
  id: string; title: string; text: string; img: string | null; button: string; href: string;
  /** everyone · visitors (not signed in) · customers (signed in) */ audience: 'all' | 'visitors' | 'customers';
  /** once ever · once a day · each visit */ freq: 'once' | 'daily' | 'visit';
  delay: number; starts_at: string; ends_at: string; is_on: boolean; created_at?: string;
};
export type PubPopup = Omit<Popup, 'is_on' | 'starts_at' | 'created_at'>;

/** All of them for Admin; [] until 2026-11-chat-carts-popups.sql has been run. */
export async function listPopups(): Promise<Popup[]> {
  const r = await db().from('popups').select('*').order('created_at', { ascending: false });
  if (r.error) return [];
  return r.data as Popup[];
}
/** The ones showing right now, for the shop. */
export async function livePopups(): Promise<PubPopup[]> {
  const now = new Date().toISOString();
  const r = await db().from('popups').select('id,title,text,img,button,href,audience,freq,delay,ends_at').eq('is_on', true).lte('starts_at', now).gt('ends_at', now).order('created_at', { ascending: false }).limit(5);
  if (r.error) return [];
  return r.data as PubPopup[];
}
