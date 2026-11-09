'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Storefront, PubProduct, PubSize } from '@/lib/storefront';
import { CartLine, lineKey, nowPrice, api } from '@/lib/shop-client';

export type Note = { id: number; kind: 'ok' | 'info' | 'warn' | 'err'; title: string; text?: string; action?: { label: string; fn: () => void }; dur: number };
export type User = { id: string; email: string; name: string | null; phone: string | null; promo_ok: boolean; created_at?: string } | null;
export type Address = { id: string; label: string; street: string; landmark: string | null; zone_id: string | null; spot?: { lat: number; lng: number; label: string; place: string } | null };
export type PricedLine = CartLine & { product: PubProduct; sizeInfo: PubSize; price: number; was: number | null; line: number; kg: number };

type Ctx = {
  data: Storefront; byId: Record<string, PubProduct>;
  cart: CartLine[]; priced: PricedLine[]; count: number; subtotal: number; kg: number;
  add: (pid: string, size: string, qty: number, swaps?: { from: string; to: string }[]) => void;
  setQty: (key: string, qty: number) => void; remove: (key: string) => void; clear: () => void; restore: (lines: CartLine[]) => void;
  cartOpen: boolean; setCartOpen: (v: boolean) => void;
  choose: string | null; setChoose: (pid: string | null) => void;
  added: { pid: string; size: string; qty: number } | null; dismissAdded: () => void;
  notes: Note[]; notify: (kind: Note['kind'], title: string, text?: string, action?: Note['action']) => void; dismiss: (id: number) => void;
  user: User; addresses: Address[]; userReady: boolean; refreshUser: () => Promise<void>; setUser: (u: User) => void;
  recent: string[]; seen: (pid: string) => void;
  chatOpen: boolean; setChatOpen: (v: boolean) => void;
};
const C = createContext<Ctx | null>(null);
export const useShop = () => { const c = useContext(C); if (!c) throw new Error('useShop outside ShopProvider'); return c; };

const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

export function ShopProvider({ data, children }: { data: Storefront; children: React.ReactNode }) {
  const byId = useMemo(() => Object.fromEntries(data.products.map(p => [p.id, p])), [data.products]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [choose, setChoose] = useState<string | null>(null);
  const [added, setAdded] = useState<Ctx['added']>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [user, setUser] = useState<User>(null);
  const [userReady, setUserReady] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const nid = useRef(0), timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({}), addedT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setCart(read<CartLine[]>('tiada_cart_v2', [])); setRecent(read<string[]>('tiada_recent', [])); setReady(true); }, []);
  useEffect(() => { if (ready) write('tiada_cart_v2', cart); }, [cart, ready]);
  // pages load normally now, so save the cart once more as the browser leaves the page
  const cartRef = useRef(cart); cartRef.current = cart;
  useEffect(() => { if (!ready) return; const save = () => write('tiada_cart_v2', cartRef.current); window.addEventListener('pagehide', save); return () => window.removeEventListener('pagehide', save); }, [ready]);

  const dismiss = useCallback((id: number) => { clearTimeout(timers.current[id]); setNotes(n => n.filter(x => x.id !== id)); }, []);
  const notify = useCallback<Ctx['notify']>((kind, title, text, action) => {
    const id = ++nid.current; const dur = kind === 'err' ? 0 : action ? 7000 : 4500;
    setNotes(n => n.concat([{ id, kind, title, text, action, dur }]).slice(-3));
    if (dur) timers.current[id] = setTimeout(() => dismiss(id), dur);
  }, [dismiss]);

  const refreshUser = useCallback(async () => {
    try { const r = await api<{ user: User; addresses?: Address[] }>('/api/me'); setUser(r.user); setAddresses(r.addresses || []); } catch { setUser(null); } finally { setUserReady(true); }
  }, []);
  useEffect(() => { refreshUser(); }, [refreshUser]);

  useEffect(() => {
    const off = () => notify('err', 'You’re offline.', 'Your cart is saved. We’ll reconnect when your signal is back.');
    const on = () => notify('ok', 'You’re back online.');
    window.addEventListener('offline', off); window.addEventListener('online', on);
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); };
  }, [notify]);

  const priced = useMemo<PricedLine[]>(() => cart.flatMap(l => {
    const p = byId[l.pid]; if (!p) return [];
    const s = p.sizes.find(x => x.label === l.size); if (!s || s.price == null) return [];
    const price = nowPrice(s); return [{ ...l, product: p, sizeInfo: s, price, was: price < (s.price || 0) ? s.price : null, line: price * l.qty, kg: s.kg * l.qty }];
  }), [cart, byId]);
  const count = priced.reduce((a, l) => a + l.qty, 0);
  const subtotal = priced.reduce((a, l) => a + l.line, 0);
  const kg = Math.round(priced.reduce((a, l) => a + l.kg, 0) * 10) / 10;

  const add: Ctx['add'] = (pid, size, qty, swaps) => {
    const key = lineKey(pid, size, swaps);
    const p = byId[pid]; const s = p?.sizes.find(x => x.label === size);
    const cap = s?.left != null ? s.left : 50;
    let finalQty = qty;
    setCart(c => {
      const prev = c.find(x => x.key === key); const want = (prev ? prev.qty : 0) + qty; finalQty = Math.min(want, cap);
      return prev ? c.map(x => (x.key === key ? { ...x, qty: finalQty } : x)) : c.concat([{ key, pid, size, qty: finalQty, swaps }]);
    });
    setChoose(null);
    if (s?.left != null && qty > s.left) notify('warn', `Only ${s.left} ${p.name} ${size !== 'Package' ? size + ' ' : ''}left.`, 'We’ve added all we have to your cart.');
    setAdded({ pid, size, qty }); if (addedT.current) clearTimeout(addedT.current); addedT.current = setTimeout(() => setAdded(null), 3500);
  };
  const setQty = (key: string, qty: number) => {
    const l = cart.find(x => x.key === key); if (!l) return;
    if (qty <= 0) return remove(key);
    const s = byId[l.pid]?.sizes.find(x => x.label === l.size); const cap = s?.left != null ? s.left : 50;
    if (qty > cap) notify('warn', `Only ${cap} left in ${l.size}.`);
    setCart(c => c.map(x => (x.key === key ? { ...x, qty: Math.min(qty, cap) } : x)));
  };
  const remove = (key: string) => {
    const l = cart.find(x => x.key === key); if (!l) return;
    setCart(c => c.filter(x => x.key !== key));
    const p = byId[l.pid];
    notify('info', `${p ? p.name : 'Item'}${l.size !== 'Package' ? ' (' + l.size + ')' : ''} removed.`, '', { label: 'Undo', fn: () => setCart(c => (c.some(x => x.key === key) ? c : c.concat([l]))) });
  };
  const clear = () => setCart([]);
  const restore = (lines: CartLine[]) => setCart(c => { const m = new Map(c.map(x => [x.key, x])); for (const l of lines) { const prev = m.get(l.key); m.set(l.key, prev ? { ...prev, qty: prev.qty + l.qty } : l); } return Array.from(m.values()); });
  const seen = useCallback((pid: string) => setRecent(r => { const n = [pid].concat(r.filter(x => x !== pid)).slice(0, 12); write('tiada_recent', n); return n; }), []);

  const v: Ctx = { data, byId, cart, priced, count, subtotal, kg, add, setQty, remove, clear, restore, cartOpen, setCartOpen, choose, setChoose, added, dismissAdded: () => setAdded(null), notes, notify, dismiss, user, addresses, userReady, refreshUser, setUser, recent, seen, chatOpen, setChatOpen };
  return <C.Provider value={v}>{children}</C.Provider>;
}
