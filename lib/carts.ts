import crypto from 'crypto';
import { after } from 'next/server';
import { db, must } from './db';
import { env } from './env';
import { getSetting, setSetting } from './catalog';
import { getStorefront } from './storefront';
import { sendMail, naira } from './email';
import { photoFor } from './photos';

/**
 * "You left something in your cart": we keep a copy of a cart when the customer is signed in, or once they type
 * their email at checkout. About 3 hours after they last touched it, one friendly email, never more than one per cart,
 * and never if they went on to pay.
 */
export type SavedLine = { key: string; pid: string; size: string; qty: number; swaps?: { from: string; to: string }[] };
const AFTER_MS = 3 * 3600e3;
const GIVE_UP_MS = 48 * 3600e3;

export async function saveCart(email: string, name: string | null, items: SavedLine[]) {
  const key = email.trim().toLowerCase();
  if (!items.length) { await db().from('carts').delete().eq('key', key); return; }
  const prev = (await db().from('carts').select('items,token').eq('key', key).maybeSingle()).data as { items: SavedLine[]; token: string } | null;
  const same = prev && JSON.stringify(prev.items) === JSON.stringify(items);
  must(await db().from('carts').upsert({
    key, email: key, name, items, token: prev?.token || crypto.randomBytes(12).toString('hex'),
    // a changed cart counts as new: the clock restarts and it can be reminded again
    ...(same ? {} : { updated_at: new Date().toISOString(), reminded_at: null }),
  }));
}
export async function cartByToken(token: string) {
  return (await db().from('carts').select('items').eq('token', token).maybeSingle()).data as { items: SavedLine[] } | null;
}
export async function clearCart(email: string) {
  await db().from('carts').delete().eq('key', email.trim().toLowerCase());
}

/** Send the reminders that are due. Safe to call often. */
export async function sweepCarts() {
  const now = Date.now();
  const due = (await db().from('carts').select('key,email,name,items,token,updated_at').is('reminded_at', null)
    .lt('updated_at', new Date(now - AFTER_MS).toISOString()).gt('updated_at', new Date(now - GIVE_UP_MS).toISOString()).limit(40)).data as
    { key: string; email: string; name: string | null; items: SavedLine[]; token: string; updated_at: string }[] | null;
  if (!due?.length) return { reminded: 0 };
  const sf = await getStorefront();
  const byId = new Map(sf.products.map(p => [p.id, p]));
  let reminded = 0;
  for (const c of due) {
    // claim it first, so two sweeps at once never send twice
    const claimed = (await db().from('carts').update({ reminded_at: new Date().toISOString() }).eq('key', c.key).is('reminded_at', null).select('key')).data;
    if (!claimed?.length) continue;
    const paid = (await db().from('orders').select('id', { count: 'exact', head: true }).ilike('email', c.email).gt('created_at', new Date(new Date(c.updated_at).getTime() - 30 * 60000).toISOString()).not('status', 'in', '(pending,expired)')).count || 0;
    if (paid) continue;
    const rows = c.items.flatMap(l => {
      const p = byId.get(l.pid); const s = p?.sizes.find(x => x.label === l.size);
      if (!p || !s || s.na || !s.price) return [];
      const each = s.sale && s.sale < s.price ? s.sale : s.price;
      return [{ name: p.name, meta: `${l.size !== 'Package' ? l.size + ' · ' : ''}Qty ${l.qty}${s.left === 0 || p.status === 'out' ? ' · now sold out' : ''}`, price: naira(each * l.qty), img: photoFor(p.id, p.img, p.cat) }];
    });
    if (!rows.length) continue;
    const name = (c.name || '').trim().split(/\s+/)[0];
    const r = await sendMail(c.email, 'You left something in your Tiada cart', {
      kicker: 'Still thinking?', title: `Your cart is waiting${name ? ', ' + name : ''}.`, preheader: 'Your items are saved. Finish your order in a tap.',
      intro: 'You added these to your cart but didn’t check out. We’ve kept them for you. Prices and stock can change, so grab them while they’re here.',
      blocks: [{ kind: 'items', title: 'In your cart', rows }, { kind: 'button', label: 'Finish my order', url: `${env.siteUrl}/?cart=${c.token}`, sub: 'Questions? Reply to this email or chat with us on the website.' }],
      why: 'You’re getting this one reminder because you started an order on tiadamarketplace.com. We won’t send another for this cart.',
    }).catch(e => ({ ok: false, error: (e as Error).message }));
    if (r.ok) reminded++;
  }
  return { reminded };
}

/** Hobby cron only runs once a day, so normal visits also check for due reminders, at most every 15 minutes. */
export function maybeSweep() {
  after(async () => {
    try {
      const lastAt = await getSetting<number>('cart_sweep_at', 0);
      if (Date.now() - lastAt < 15 * 60000) return;
      await setSetting('cart_sweep_at', Date.now());
      await sweepCarts();
      await closeIdleChats();
    } catch (e) { console.error('cart sweep', (e as Error).message); }
  });
}

/** Chats nobody has written in for 2 hours are closed, so the Chat page stays tidy. */
export async function closeIdleChats() {
  await db().from('chats').update({ status: 'closed' }).neq('status', 'closed').lt('updated_at', new Date(Date.now() - 2 * 3600e3).toISOString());
}
