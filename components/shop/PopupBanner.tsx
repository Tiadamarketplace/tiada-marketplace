'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShop } from './ShopProvider';
import type { PubPopup } from '@/lib/popups';

const REPACK = 'tiada_repack_ok_v1';
const seenKey = (id: string) => 'tiada_pop_' + id;
const get = (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } };
const put = (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* private mode */ } };

/** Has this person already seen it as often as the admin allowed? */
function due(p: PubPopup) {
  if (p.freq === 'visit') return !get(sessionStorage, seenKey(p.id));
  const at = Number(get(localStorage, seenKey(p.id)) || 0);
  if (!at) return true;
  return p.freq === 'daily' && Date.now() - at > 20 * 3600e3;
}

/** The pop-up banner from Admin → Pop-ups. Waits for the repack notice to be closed, then the admin's delay. */
export default function PopupBanner() {
  const { data, user, userReady } = useShop();
  const [p, setP] = useState<PubPopup | null>(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!userReady) return;
    const list = (data.popups || []).filter(x => (x.audience === 'all' || (x.audience === 'customers') === !!user) && Date.parse(x.ends_at) > Date.now() && due(x));
    const pick = list[0];
    if (!pick || location.pathname.startsWith('/checkout')) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const wait = setInterval(() => {
      if (!get(localStorage, REPACK)) return; // the first-visit notice is still open
      clearInterval(wait);
      t = setTimeout(() => setP(pick), Math.max(0, pick.delay) * 1000 + 400);
    }, 800);
    return () => { clearInterval(wait); if (t) clearTimeout(t); };
  }, [userReady, !!user]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (!p) return;
    if (p.freq === 'visit') put(sessionStorage, seenKey(p.id), '1'); else put(localStorage, seenKey(p.id), String(Date.now()));
    setLeaving(true); setTimeout(() => { setP(null); setLeaving(false); }, 300);
  };
  useEffect(() => {
    if (!p) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  const go = () => { close(); if (p.href) { if (/^https:/.test(p.href)) window.open(p.href, '_blank', 'noopener'); else window.location.assign(p.href); } };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={p.title} onClick={e => { if (e.target === e.currentTarget) close(); }} style={{ position: 'fixed', inset: 0, zIndex: 94, background: 'rgba(17,32,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} className={'dr-back' + (leaving ? ' out' : '')}>
      <div className="pop" style={{ position: 'relative', width: p.img ? 'min(480px, 100%)' : 'min(400px, 100%)', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 8, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}>
        <button type="button" className="ub" autoFocus onClick={close} aria-label="Close" style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.94)', boxShadow: '0 2px 10px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2A23" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {p.img && (
          <button type="button" className="ub" onClick={p.href ? go : undefined} tabIndex={-1} aria-hidden="true" style={{ display: 'block', minHeight: 0, flex: '0 1 auto', overflow: 'hidden', cursor: p.href ? 'pointer' : 'default', background: '#F4F1EA' }}>
            <img src={p.img} alt="" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: p.text || p.href ? 'calc(100vh - 200px)' : 'calc(100vh - 32px)', objectFit: 'contain' }} />
          </button>
        )}
        {(p.text || p.href || !p.img) && (
          <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!p.img && <h2 style={{ margin: '0 40px 0 0', fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{p.title}</h2>}
            {p.text && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#3C4741' }}>{p.text}</p>}
            {p.href && <button type="button" className="ub btn-solid press" onClick={go} style={{ height: 48, borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.button || 'Shop now'}</button>}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
