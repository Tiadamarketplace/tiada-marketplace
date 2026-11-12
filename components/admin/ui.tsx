'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Overlays go straight into <body> so animated parents can't trap them. */
const Portal = ({ children }: { children: React.ReactNode }) => { const [ok, setOk] = useState(false); useEffect(() => setOk(true), []); return ok ? createPortal(<div className="adm" style={{ minHeight: 0, background: 'none' }}>{children}</div>, document.body) : null; };

export const naira = (n: number) => '₦' + Math.round(n || 0).toLocaleString('en-NG');
export const ago = (iso: string) => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};
export const dt = (iso: string) => new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const fmtPhone = (p?: string | null) => { const d = (p || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : p || ''; };

export async function call<T = unknown>(url: string, json?: unknown, method?: string): Promise<T> {
  const r = await fetch(url, { method: method || (json !== undefined ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json' }, body: json !== undefined ? JSON.stringify(json) : undefined, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j as { error?: string }).error || 'Something went wrong. Try again.'), { status: r.status });
  return j as T;
}

/* ---------- toasts ---------- */
type Toast = { id: number; kind: 'ok' | 'err' | 'info'; text: string; sub?: string; action?: { label: string; fn: () => void } };
const TC = createContext<(kind: Toast['kind'], text: string, sub?: string, action?: Toast['action']) => void>(() => {});
export const useToast = () => useContext(TC);
export function Toasts({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const n = useRef(0);
  const push = useCallback((kind: Toast['kind'], text: string, sub?: string, action?: Toast['action']) => {
    const id = ++n.current; setList(l => l.concat([{ id, kind, text, sub, action }]).slice(-3));
    if (kind !== 'err') setTimeout(() => setList(l => l.filter(t => t.id !== id)), action ? 7000 : 4000);
  }, []);
  return (
    <TC.Provider value={push}>
      {children}
      <div aria-live="polite" style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 120, display: 'flex', flexDirection: 'column', gap: 8, width: 'min(440px, calc(100vw - 24px))' }}>
        {list.map(t => (
          <div key={t.id} role={t.kind === 'err' ? 'alert' : 'status'} className="toast" style={{ background: t.kind === 'err' ? '#6E2417' : t.kind === 'ok' ? '#0B3A23' : '#1F2A23', color: '#F4EFE3', borderRadius: 10, boxShadow: '0 14px 34px rgba(10,20,14,.25)', padding: '12px 8px 12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5, lineHeight: 1.45 }}>
            <span style={{ flex: 1 }}><strong style={{ fontWeight: 600 }}>{t.text}</strong>{t.sub ? <span style={{ opacity: 0.8 }}> {t.sub}</span> : null}</span>
            {t.action && <button type="button" className="ub" onClick={() => { t.action!.fn(); setList(l => l.filter(x => x.id !== t.id)); }} style={{ fontWeight: 700, color: '#E9B969', padding: '6px 8px' }}>{t.action.label}</button>}
            <button type="button" className="ub" aria-label="Close" onClick={() => setList(l => l.filter(x => x.id !== t.id))} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>✕</button>
          </div>
        ))}
      </div>
    </TC.Provider>
  );
}

/* ---------- building blocks ---------- */
export const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #ECE8DF', borderRadius: 14, boxShadow: '0 1px 2px rgba(17,32,23,0.04)' };
export const input: React.CSSProperties = { height: 44, padding: '0 12px', borderRadius: 8, border: '1px solid #DCD6CA', fontSize: 14, background: '#FFFFFF', color: '#1F2A23', width: '100%' };
export const lab: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#1F2A23' };

export function Btn({ children, onClick, kind = 'solid', small, disabled, type = 'button', danger, style, title }: { children: React.ReactNode; onClick?: () => unknown; kind?: 'solid' | 'out' | 'soft' | 'text'; small?: boolean; disabled?: boolean; type?: 'button' | 'submit'; danger?: boolean; style?: React.CSSProperties; title?: string }) {
  // Every button that does work shows a spinner while it runs: either its onClick returns a promise,
  // or its label says it's busy ("Saving…", "Sending…").
  const [running, setRunning] = useState(false);
  const busyLabel = typeof children === 'string' && children.endsWith('…');
  const busy = running || busyLabel;
  const h = small ? 36 : 42;
  const off = disabled || running;
  const base: React.CSSProperties = { height: h, padding: kind === 'text' ? '0 4px' : `0 ${small ? 12 : 16}px`, borderRadius: 9, fontSize: small ? 12.5 : 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap', opacity: off && !busy ? 0.5 : off ? 0.8 : 1, pointerEvents: off ? 'none' : undefined };
  const look: Record<string, React.CSSProperties> = {
    solid: { background: danger ? '#7A2A1B' : '#0B3A23', color: '#FFFFFF' },
    out: { border: `1px solid ${danger ? '#E7C3B9' : '#DCD6CA'}`, background: '#FFFFFF', color: danger ? '#9E3522' : '#1F2A23' },
    soft: { background: '#F2EFE8', color: '#1F2A23' },
    text: { color: danger ? '#9E3522' : '#0B3A23', textDecoration: 'underline', textUnderlineOffset: 3 },
  };
  const click = onClick && (() => {
    const r = onClick();
    if (r && typeof (r as Promise<unknown>).then === 'function') { setRunning(true); (r as Promise<unknown>).finally(() => setRunning(false)); }
  });
  const light = kind === 'solid';
  return <button type={type} title={title} aria-busy={busy || undefined} className={`ub press ${kind === 'solid' ? 'btn-solid' : kind === 'out' ? 'qbtn' : kind === 'soft' ? 'btn-soft' : ''}`} onClick={click} disabled={off} style={{ ...base, ...look[kind], ...style }}>
    {busy && <span aria-hidden="true" style={{ width: small ? 13 : 15, height: small ? 13 : 15, flex: 'none', borderRadius: '50%', border: `2px solid ${light ? 'rgba(255,255,255,0.35)' : 'rgba(11,58,35,0.2)'}`, borderTopColor: light ? '#FFFFFF' : danger ? '#9E3522' : '#0B3A23', animation: 'spin .8s linear infinite' }} />}
    {children}
  </button>;
}
/**
 * On/off switch. It flips the moment it is tapped; if saving fails the screen goes back to what was saved
 * (the parent reloads or keeps the old value), at the latest after 10 seconds.
 */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => unknown; label: string }) {
  const [pending, setPending] = useState<boolean | null>(null);
  const shown = pending ?? on;
  useEffect(() => { setPending(null); }, [on]);
  useEffect(() => { if (pending === null) return; const t = setTimeout(() => setPending(null), 10000); return () => clearTimeout(t); }, [pending]);
  const tap = () => {
    const v = !shown;
    setPending(v);
    const r = onChange(v) as Promise<unknown> | undefined;
    // when the save finishes (and the page has the saved value), show the real value again
    if (r && typeof r.then === 'function') r.then(() => setPending(null), () => setPending(null));
  };
  return (
    <button type="button" className="ub" role="switch" aria-checked={shown} aria-label={label} onClick={tap} style={{ width: 40, height: 24, borderRadius: 999, background: shown ? '#0B3A23' : '#C9CFC9', position: 'relative', flex: 'none', transition: 'background .15s ease' }}>
      <span className="knob" style={{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', transform: `translateX(${shown ? 16 : 0}px)`, transition: 'transform .15s ease' }} />
    </button>
  );
}
export function Pill({ children, bg = '#F2EFE8', fg = '#4D5A52' }: { children: React.ReactNode; bg?: string; fg?: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: bg, color: fg, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>;
}
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: [T, string, number?][] }) {
  return (
    <div role="tablist" className="noscroll" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 11, background: '#ECE8DF', overflowX: 'auto', maxWidth: '100%' }}>
      {tabs.map(([k, l, n]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className="ub" onClick={() => onChange(k)} style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, background: value === k ? '#FFFFFF' : 'transparent', color: value === k ? '#0B3A23' : '#4D5A52', boxShadow: value === k ? '0 1px 3px rgba(17,32,23,.12)' : 'none' }}>
          {l}{n ? <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: value === k ? '#0B3A23' : '#D9D3C6', color: value === k ? '#FFFFFF' : '#1F2A23', fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span> : null}
        </button>
      ))}
    </div>
  );
}
export function Drawer({ title, sub, onClose, children, foot, wide }: { title: string; sub?: React.ReactNode; onClose: () => void; children: React.ReactNode; foot?: React.ReactNode; wide?: boolean }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; }; }, [onClose]);
  return (<Portal>
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div className="scrim" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(17,32,23,0.42)' }} />
      <aside role="dialog" aria-modal="true" aria-label={title} className="slide" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `min(${wide ? 760 : 560}px, 100vw)`, background: '#FFFFFF', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(17,32,23,.18)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 18px 14px 24px', borderBottom: '1px solid #ECE8DF' }}>
          <div style={{ flex: 1, minWidth: 0 }}><h2 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{title}</h2>{sub && <div style={{ marginTop: 4, fontSize: 13, color: '#66736B' }}>{sub}</div>}</div>
          <button type="button" className="ub qbtn" aria-label="Close" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 9, border: '1px solid #E4DFD3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div className="thin" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px' }}>{children}</div>
        {foot && <div style={{ padding: '14px 24px', borderTop: '1px solid #ECE8DF', display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', background: '#FBF9F4' }}>{foot}</div>}
      </aside>
    </div>
  </Portal>);
}
export function Confirm({ title, text, yes, danger, onNo, onYes, children }: { title: string; text?: string; yes: string; danger?: boolean; onNo: () => void; onYes: () => unknown; children?: React.ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onNo(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onNo]);
  return (<Portal>
    <div role="alertdialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(17,32,23,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="pop" style={{ width: 'min(440px, 100%)', background: '#FFFFFF', borderRadius: 14, padding: '24px 24px 20px', boxShadow: '0 24px 60px rgba(0,0,0,.22)' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
        {text && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: '#4D5A52' }}>{text}</p>}
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}><Btn kind="out" onClick={onNo}>Cancel</Btn><Btn danger={danger} onClick={onYes}>{yes}</Btn></div>
      </div>
    </div>
  </Portal>);
}
export function Empty({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return <div style={{ padding: '44px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><p className="serif" style={{ margin: 0, fontSize: 22, color: '#0B3A23' }}>{title}</p>{text && <p style={{ margin: 0, fontSize: 13.5, color: '#66736B', maxWidth: 420, lineHeight: 1.6 }}>{text}</p>}{children}</div>;
}
export function Section({ title, sub, right, children, pad = true }: { title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; pad?: boolean }) {
  return (
    <section style={{ ...card, overflow: 'hidden' }}>
      {(title || right) && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '18px 20px 12px' }}><div>{title && <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>}{sub && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#66736B' }}>{sub}</p>}</div>{right}</div>}
      <div style={{ padding: pad ? '0 20px 20px' : 0 }}>{children}</div>
    </section>
  );
}

/** Shrink a photo in the browser before upload: square crop for products, up to 1920px wide for banners. */
export async function prepImage(file: File, mode: 'square' | 'wide'): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file isn’t a picture we can read.')); i.src = url; });
    const c = document.createElement('canvas'); const x = c.getContext('2d')!;
    if (mode === 'square') {
      const s = Math.min(img.width, img.height); const out = Math.min(1000, s);
      c.width = c.height = out; x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, out, out);
      x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, out, out);
    } else {
      // banners keep their shape; 1920 wide keeps the words in finished banners sharp
      const w = Math.min(1920, img.width); const h = Math.round((img.height / img.width) * w);
      c.width = w; c.height = h; x.drawImage(img, 0, 0, w, h);
    }
    return c.toDataURL('image/jpeg', mode === 'wide' ? 0.9 : 0.86);
  } finally { URL.revokeObjectURL(url); }
}

/** A short two-note chime for new orders (no sound file needed). */
export function chime() {
  try {
    const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; const a = new A();
    [[880, 0], [1320, 0.16]].forEach(([f, t]) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0.0001, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.5); o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.55); });
  } catch { /* sound blocked until the page is clicked */ }
}
export const STATUS: Record<string, [string, string, string]> = {
  new: ['To pack', '#F6E9CF', '#6B4A12'], packed: ['Packed', '#E3ECF6', '#20456B'], route: ['On the way', '#E6EEE8', '#0B3A23'], done: ['Delivered', '#0B3A23', '#FFFFFF'],
  issue: ['Problem', '#FBEFEB', '#7A2A1B'], refunded: ['Refunded', '#EFEDE6', '#4D5A52'], cancelled: ['Cancelled', '#EFEDE6', '#4D5A52'],
};
export const StatusPill = ({ s }: { s: string }) => { const [l, bg, fg] = STATUS[s] || [s, '#EEE', '#333']; return <Pill bg={bg} fg={fg}>{l}</Pill>; };
export const AISLE: Record<string, string> = { cereal: 'Breakfast Cereals', milk: 'Milk & Beverages', grain: 'Oats & Custard', food: 'Foodstuffs', ccombo: 'Cereal Combos', fcombo: 'Foodstuff Combos' };
