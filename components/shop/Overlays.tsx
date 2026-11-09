'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Pop-ups render into <body> so an animated page can't trap them. */
function Portal({ children }: { children: React.ReactNode }) { const [ok, setOk] = useState(false); useEffect(() => setOk(true), []); return ok ? createPortal(children, document.body) : null; }
import { useShop } from './ShopProvider';
import { naira, nowPrice, inStock, defaultSize, api, waLink } from '@/lib/shop-client';
import { IClose, ICheck } from './Icons';
import { ProductImage } from './ProductCard';

const X = ({ c = '#1F2A23', s = 18 }: { c?: string; s?: number }) => <IClose size={s} color={c} />;
const Thumb = ({ pid, size }: { pid: string; size: number }) => {
  const { byId } = useShop(); const p = byId[pid];
  return <span style={{ position: 'relative', width: size, height: size, flex: 'none', borderRadius: 6, overflow: 'hidden', background: '#F7F4EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p && <ProductImage p={p} size={12} />}</span>;
};

export function useEscape(on: boolean, fn: () => void) {
  useEffect(() => { if (!on) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') fn(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [on, fn]);
}

export function CartDrawer() {
  const { cartOpen, setCartOpen, priced, subtotal, setQty, remove, count } = useShop();
  const router = useRouter();
  const close = () => setCartOpen(false);
  useEscape(cartOpen, close);
  if (!cartOpen) return null;
  const go = (h: string) => { close(); router.push(h); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      <button type="button" className="ub" aria-label="Close cart" onClick={close} style={{ position: 'absolute', inset: 0, width: '100%', background: 'rgba(17,32,23,0.42)', animation: 'fadeIn .2s' }} />
      <aside aria-label="Your cart" role="dialog" aria-modal="true" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(420px, 92vw)', background: '#FFFFFF', display: 'flex', flexDirection: 'column', animation: 'slideR .32s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 14px 24px', borderBottom: '1px solid #ECE8DF' }}>
          <h2 style={{ margin: 0, fontWeight: 500, fontSize: 20 }}>Your cart{count ? ` (${count})` : ''}</h2>
          <button type="button" className="ub icn" aria-label="Close cart" onClick={close} style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X s={20} /></button>
        </div>
        {!priced.length ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Your cart is empty</p>
            <button type="button" className="ub btn-solid" onClick={() => go('/aisle/all')} style={{ height: 48, padding: '0 26px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontWeight: 600, display: 'flex', alignItems: 'center' }}>Start shopping</button>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="thin" style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              {priced.map(it => (
                <div key={it.key} style={{ display: 'flex', gap: 14, padding: '18px 0', borderBottom: '1px solid #ECE8DF' }}>
                  <Thumb pid={it.pid} size={76} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 14.5, fontWeight: 500 }}>{it.product.name}</span><span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{naira(it.line)}</span></div>
                    <span style={{ fontSize: 12.5, color: '#66736B' }}>{it.size} · {naira(it.price)}{it.was ? <s style={{ marginLeft: 6 }}>{naira(it.was)}</s> : null}</span>
                    {it.swaps?.length ? <span style={{ fontSize: 12, color: '#66736B' }}>Swapped: {it.swaps.map(w => `${w.from} → ${w.to}`).join(', ')}</span> : null}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <Stepper qty={it.qty} dec={() => setQty(it.key, it.qty - 1)} inc={() => setQty(it.key, it.qty + 1)} />
                      <button type="button" className="ub quiet" onClick={() => remove(it.key)} style={{ minHeight: 38, fontSize: 13, color: '#66736B', textDecoration: 'underline', textUnderlineOffset: 3 }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '20px 24px 24px', borderTop: '1px solid #ECE8DF', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}><span>Subtotal</span><span style={{ fontWeight: 600 }}>{naira(subtotal)}</span></div>
              <span style={{ fontSize: 12.5, color: '#66736B' }}>Delivery is added at checkout.</span>
              <button type="button" className="ub btn-solid press" onClick={() => go('/checkout')} style={{ height: 52, borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Check out</button>
              <button type="button" className="ub lnk" onClick={() => go('/cart')} style={{ alignSelf: 'center', fontSize: 14, minHeight: 36 }}>View cart</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export function Stepper({ qty, dec, inc, h = 38 }: { qty: number; dec: () => void; inc: () => void; h?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: h, border: '1px solid #DCD6CA', borderRadius: 4 }}>
      <button type="button" className="ub icn" aria-label="One less" onClick={dec} style={{ width: h, height: h - 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>−</button>
      <span style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{qty}</span>
      <button type="button" className="ub icn" aria-label="One more" onClick={inc} style={{ width: h, height: h - 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>+</button>
    </div>
  );
}

export function ChooseSize() {
  const { choose, setChoose, byId, add } = useShop();
  const router = useRouter();
  const p = choose ? byId[choose] : null;
  const [i, setI] = useState(0);
  const [qty, setQ] = useState(1);
  useEffect(() => { if (p) { setI(defaultSize(p)); setQ(1); } }, [p]);
  const close = () => setChoose(null);
  useEscape(!!p, close);
  if (!p) return null;
  const s = p.sizes[i];
  const ok = s && inStock(p, s);
  const cap = s?.left != null ? s.left : 50;
  const details = () => { close(); router.push('/p/' + p.id); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 75 }}>
      <button type="button" className="ub" aria-label="Close" onClick={close} style={{ position: 'absolute', inset: 0, width: '100%', background: 'rgba(17,32,23,0.42)', animation: 'fadeIn .2s' }} />
      <div role="dialog" aria-modal="true" aria-label={`Choose a size of ${p.name}`} className="sheet pop" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(560px, 92vw)', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 30px 80px rgba(17,32,23,0.25)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Thumb pid={p.id} size={92} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 19, fontWeight: 500 }}>{p.name}</span>
            {s && <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 18, fontWeight: 600, color: s.sale ? '#9A4E12' : '#0B3A23' }}>{naira(nowPrice(s))}</span>{s.sale && s.price && s.sale < s.price ? <s style={{ fontSize: 13.5, color: '#8B958E' }}>{naira(s.price)}</s> : null}</span>}
          </div>
          <button type="button" className="ub icn" aria-label="Close" onClick={close} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><X /></button>
        </div>
        <div role="radiogroup" aria-label="Size" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {p.sizes.map((z, j) => {
            if (z.na || z.price == null) return <span key={z.label} style={{ minHeight: 58, padding: '10px 14px', borderRadius: 4, border: '1.5px dashed #E2DDD0', color: '#A3ABA5', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}><span style={{ fontSize: 14, textDecoration: 'line-through' }}>{z.label}</span><span style={{ fontSize: 12 }}>Not available</span></span>;
            const sel = j === i, out = !inStock(p, z);
            return (
              <button key={z.label} type="button" className="ub opt" role="radio" aria-checked={sel} onClick={() => { setI(j); setQ(1); }}
                style={{ minHeight: 58, padding: '10px 14px', borderRadius: 4, border: `1.5px ${out ? 'dashed' : 'solid'} ${sel ? '#0B3A23' : '#DCD6CA'}`, background: sel ? '#F1F5F1' : '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: out ? '#8B958E' : '#1F2A23' }}>{z.label}</span>
                <span style={{ fontSize: 13, color: out ? '#B8402B' : z.sale ? '#9A4E12' : '#4D5A52' }}>{out ? 'Sold out' : z.left != null ? `${naira(nowPrice(z))} · ${z.left} left` : naira(nowPrice(z))}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {ok && <Stepper h={50} qty={qty} dec={() => setQ(q => Math.max(1, q - 1))} inc={() => setQ(q => Math.min(cap, q + 1))} />}
          {ok
            ? <button type="button" className="ub btn-solid press" onClick={() => add(p.id, s.label, qty)} style={{ flex: 1, height: 50, borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Add to cart · {naira(nowPrice(s) * qty)}</button>
            : <button type="button" className="ub btn-out" onClick={details} style={{ flex: 1, height: 50, borderRadius: 4, border: '1.5px solid #0B3A23', color: '#0B3A23', fontSize: 14.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sold out · get told when it’s back</button>}
        </div>
        <button type="button" className="ub lnk" onClick={details} style={{ alignSelf: 'center', fontSize: 13.5, minHeight: 32 }}>View full details</button>
      </div>
    </div>
  );
}

export function AddedPopup() {
  const { added, dismissAdded, byId, count, setCartOpen } = useShop();
  if (!added) return null;
  const p = byId[added.pid]; if (!p) return null;
  return (
    <div role="status" className="drop-in" style={{ position: 'fixed', top: 16, right: 'clamp(12px, 3vw, 28px)', zIndex: 72, width: 'min(360px, calc(100vw - 24px))', background: '#FFFFFF', borderRadius: 8, boxShadow: '0 20px 50px rgba(17,32,23,0.2)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}><ICheck size={18} color="#0B3A23" stroke={2.4} />Added to your cart</span>
        <button type="button" className="ub icn" aria-label="Dismiss" onClick={dismissAdded} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X c="#66736B" s={16} /></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Thumb pid={p.id} size={56} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span><span style={{ fontSize: 12.5, color: '#66736B' }}>{added.size} · Qty {added.qty}</span></span>
      </div>
      <button type="button" className="ub btn-out" onClick={() => { dismissAdded(); setCartOpen(true); }} style={{ height: 44, borderRadius: 4, border: '1.5px solid #0B3A23', color: '#0B3A23', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>View cart ({count})</button>
    </div>
  );
}

const K = {
  ok: { bg: '#0B3A23', title: '#FFFFFF' }, info: { bg: '#1F2A23', title: '#FFFFFF' },
  warn: { bg: '#2E2716', title: '#F0C77E' }, err: { bg: '#6E2417', title: '#FFFFFF' },
};
export function Toasts() {
  const { notes, dismiss } = useShop();
  return (
    <div className="toasts" aria-live="polite">
      {notes.map(n => (
        <div key={n.id} role={n.kind === 'err' ? 'alert' : 'status'} className="drop-in" style={{ background: K[n.kind].bg, color: '#F4EFE3', borderRadius: 6, boxShadow: '0 10px 30px rgba(10,20,14,0.22)', padding: '13px 8px 13px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.5 }}><span style={{ fontWeight: 600, color: K[n.kind].title }}>{n.title}</span>{n.text ? <span style={{ opacity: 0.82 }}> {n.text}</span> : null}</span>
          {n.action && <button type="button" className="ub" onClick={() => { n.action!.fn(); dismiss(n.id); }} style={{ flex: 'none', height: 34, padding: '0 10px', fontSize: 13.5, fontWeight: 700, color: '#E9B969' }}>{n.action.label}</button>}
          <button type="button" className="ub" aria-label="Close" onClick={() => dismiss(n.id)} style={{ flex: 'none', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F4EFE3', opacity: 0.6 }}><IClose size={14} stroke={2.2} /></button>
        </div>
      ))}
    </div>
  );
}

export function Dialog({ title, text, list, noLabel = 'Cancel', yesLabel, danger, onNo, onYes }: { title: string; text: string; list?: { name: string; note: string }[]; noLabel?: string; yesLabel: string; danger?: boolean; onNo: () => void; onYes: () => void }) {
  useEscape(true, onNo);
  return (<Portal>
    <div role="alertdialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 86, background: 'rgba(17,32,23,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="pop" style={{ width: 'min(420px, 100%)', background: '#FFFFFF', borderRadius: 8, boxShadow: '0 24px 60px rgba(0,0,0,0.22)', padding: '28px 26px 22px' }}>
        <h2 style={{ margin: 0, fontWeight: 600, fontSize: 20, letterSpacing: '-0.01em' }}>{title}</h2>
        <p style={{ margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.65, color: '#4D5A52' }}>{text}</p>
        {list?.length ? <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none' }}>{list.map((l, k) => <li key={k} style={{ padding: '10px 0', borderTop: '1px solid #ECE8DF', fontSize: 14, lineHeight: 1.5 }}><strong style={{ fontWeight: 600 }}>{l.name}</strong> <span style={{ color: '#4D5A52' }}>{l.note}</span></li>)}</ul> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: '6px 18px', marginTop: 22 }}>
          <button type="button" className="ub" onClick={onNo} style={{ minHeight: 44, padding: '0 4px', fontSize: 14.5, fontWeight: 600, color: '#1F2A23', textDecoration: 'underline', textUnderlineOffset: 4 }}>{noLabel}</button>
          <button type="button" className="ub btn-solid press" onClick={onYes} style={{ height: 46, padding: '0 22px', borderRadius: 4, background: danger ? '#7A2A1B' : '#0B3A23', color: '#FFFFFF', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{yesLabel}</button>
        </div>
      </div>
    </div>
  </Portal>);
}

export function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEscape(true, onClose);
  return (<Portal>
    <div role="dialog" aria-label={`${name} picture`} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(12,20,15,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 20px 40px', animation: 'fadeIn .2s' }}>
      <button type="button" className="ub" aria-label="Close picture" onClick={onClose} style={{ position: 'absolute', inset: 0, width: '100%' }} />
      <img className="pop" src={src} alt={name} style={{ position: 'relative', width: 'min(500px, 92vw, 78vh)', height: 'auto', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 6, boxShadow: '0 30px 80px rgba(0,0,0,0.45)', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 16, textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 13.5, pointerEvents: 'none' }}>{name}</span>
      <button type="button" className="ub" aria-label="Close picture" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IClose size={22} color="#FFFFFF" /></button>
    </div>
  </Portal>);
}

/** Thin gold bar at the top while a new page loads. */
export function RouteBar() {
  const path = usePathname();
  const [st, setSt] = useState<'off' | 'run' | 'done'>('off');
  const first = useRef(true);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const u = new URL(a.href, location.href);
      if (u.origin === location.origin && u.pathname !== location.pathname) setSt('run');
    };
    const go = () => setSt('run');
    document.addEventListener('click', h, true); window.addEventListener('tiada:nav', go);
    return () => { document.removeEventListener('click', h, true); window.removeEventListener('tiada:nav', go); };
  }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSt('done'); const t = setTimeout(() => setSt('off'), 500); window.scrollTo({ top: 0 }); return () => clearTimeout(t);
  }, [path]);
  if (st === 'off') return null;
  return (
    <div role="progressbar" aria-label="Loading page" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 3, pointerEvents: 'none' }}>
      <span className={st === 'run' ? 'bar-run' : 'bar-done'} style={{ display: 'block', height: '100%', background: 'linear-gradient(90deg, #D49B41, #E9C27F)', boxShadow: '0 0 10px rgba(212,155,65,0.6)' }} />
    </div>
  );
}

type Msg = { id: number; who: string; text: string };
const BOT: Record<string, string> = {
  track: 'Put your order code (it starts with TD-) on the Track page and you’ll see where it is. Signed in? Your orders are under My account.',
  days: 'We deliver in Lagos and Oyo State. Every Lagos area has its own delivery day, and Oyo orders go by courier. You’ll see your fee and day at checkout.',
  swap: 'On any combo, tap “Swap items” and change what you don’t want. The price stays the same.',
  person: 'Okay, I’ve asked the team to join this chat. Someone will reply here shortly.',
};
export function Chat() {
  const { chatOpen, setChatOpen, notify, data } = useShop();
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, who: 'bot', text: 'Hi! How can we help today?' }]);
  const [draft, setDraft] = useState('');
  const sess = useRef<{ id: string; token: string } | null>(null);
  const last = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { try { const s = localStorage.getItem('tiada_chat'); if (s) sess.current = JSON.parse(s); } catch { /* */ } }, []);
  useEffect(() => { box.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [msgs, chatOpen]);

  const start = async () => {
    if (sess.current) return sess.current;
    const s = await api<{ id: string; token: string }>('/api/chat', { json: { action: 'start' } });
    sess.current = s; try { localStorage.setItem('tiada_chat', JSON.stringify(s)); } catch { /* */ }
    return s;
  };
  const poll = async () => {
    const s = sess.current; if (!s) return;
    try {
      const r = await api<{ status: string; messages: Msg[] }>(`/api/chat?id=${s.id}&token=${s.token}&after=${last.current}`);
      if (r.messages.length) { last.current = r.messages[r.messages.length - 1].id; setMsgs(m => { const seen = new Set(m.map(x => x.id)); return m.concat(r.messages.filter(x => !seen.has(x.id))); }); }
      if (r.status === 'closed') { sess.current = null; localStorage.removeItem('tiada_chat'); }
    } catch (e) { if ((e as { status?: number }).status === 404) { sess.current = null; try { localStorage.removeItem('tiada_chat'); } catch { /* */ } } }
  };
  useEffect(() => { if (!chatOpen) return; poll(); const t = setInterval(poll, 4000); return () => clearInterval(t); }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (who: 'me' | 'bot', text: string) => {
    const s = await start();
    const r = await api<{ id: number }>('/api/chat', { json: { action: 'send', id: s.id, token: s.token, who, text } });
    last.current = Math.max(last.current, r.id);
    setMsgs(m => m.concat([{ id: r.id, who, text }]));
  };
  const say = async (text: string, topic?: string) => {
    try {
      await send('me', text);
      if (topic) { await send('bot', BOT[topic]); if (topic === 'person' && sess.current) await api('/api/chat', { json: { action: 'escalate', ...sess.current } }); }
    } catch (e) { notify('err', 'Your message didn’t send.', (e as Error).message); }
  };
  const submit = () => { const t = draft.trim(); if (!t) return; setDraft(''); say(t); };

  return (
    <>
      {chatOpen && (
        <div role="dialog" aria-label="Tiada help" className="chat-panel pop" style={{ position: 'fixed', right: 20, bottom: 92, zIndex: 66, width: 'min(370px, calc(100vw - 24px))', height: 'min(520px, calc(100vh - 140px))', background: '#FFFFFF', borderRadius: 14, boxShadow: '0 24px 60px rgba(17,32,23,0.24)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: '#0B3A23', color: '#FFFFFF', padding: '16px 14px 16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#FBF9F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><img src="/logo-icon.png" alt="" style={{ width: 30, height: 'auto' }} /></span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 15, fontWeight: 600 }}>Tiada help</span><span style={{ fontSize: 12, color: 'rgba(236,241,237,0.8)' }}>We usually reply within minutes</span></span>
            <button type="button" className="ub" aria-label="Close help" onClick={() => setChatOpen(false)} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X c="#FFFFFF" /></button>
          </div>
          <div ref={box} className="thin" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#FBF9F4' }}>
            {msgs.map(m => m.who === 'sys'
              ? <div key={m.id} style={{ alignSelf: 'center', fontSize: 12, color: '#66736B' }}>{m.text}</div>
              : <div key={m.id} className="fade" style={{ alignSelf: m.who === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%', padding: '10px 14px', borderRadius: 14, background: m.who === 'me' ? '#0B3A23' : '#FFFFFF', color: m.who === 'me' ? '#FFFFFF' : '#1F2A23', fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.text}</div>)}
            {msgs.length <= 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {[['Where’s my order?', 'track'], ['Delivery days', 'days'], ['Swapping combo items', 'swap'], ['Talk to a person', 'person']].map(([l, t]) => (
                  <button key={t} type="button" className="ub chip" onClick={() => say(l, t)} style={{ height: 36, padding: '0 14px', borderRadius: 999, border: '1px solid #DCD6CA', background: '#FFFFFF', fontSize: 13, display: 'flex', alignItems: 'center' }}>{l}</button>
                ))}
              </div>
            )}
          </div>
          <a href={waLink(data.business.whatsapp)} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, background: '#E9F5EE', color: '#0B3A23', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Prefer WhatsApp? {data.business.phone}</a>
          <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #ECE8DF' }}>
            <label htmlFor="chat-in" style={{ position: 'absolute', left: -9999 }}>Message</label>
            <input id="chat-in" type="text" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type a message…" maxLength={1500} style={{ flex: 1, minWidth: 0, height: 44, padding: '0 14px', borderRadius: 999, border: '1px solid #DCD6CA', fontSize: 14 }} />
            <button type="submit" className="ub btn-solid" aria-label="Send" style={{ width: 44, height: 44, borderRadius: '50%', background: '#0B3A23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
          </form>
        </div>
      )}
      <button type="button" className="ub chat-fab press" aria-label={chatOpen ? 'Close help' : 'Chat with Tiada'} aria-expanded={chatOpen} onClick={() => setChatOpen(!chatOpen)} style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 66, width: 58, height: 58, borderRadius: '50%', background: '#0B3A23', boxShadow: '0 12px 30px rgba(11,58,35,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {chatOpen ? <IClose size={22} color="#F6E9CF" stroke={2} /> : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F6E9CF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.7A8 8 0 1 1 21 12z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></svg>}
      </button>
    </>
  );
}

