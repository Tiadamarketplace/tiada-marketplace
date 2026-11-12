'use client';
import { useRef, useState } from 'react';
import type { Ctx } from './Desk';
import type { Promo } from './types';
import Slider from '@/components/shop/Slider';
import { card, Btn, Drawer, Confirm, Empty, Switch, Pill, call, useToast, input, lab, prepImage, AISLE } from './ui';

const SWATCHES = ['#0B3A23', '#14532F', '#D49B41', '#8A5F1C', '#7A2A1B', '#1F2A23', '#20456B', '#F6E9CF'];
const today = () => new Date().toISOString().slice(0, 10);
const plus = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const href = (t: string, to: string | null) => (t === 'product' ? `/p/${to}` : t === 'aisle' ? `/aisle/${to}` : t === 'deals' ? '/aisle/deals' : to || '/');
const live = (p: Promo, now: number) => p.is_on && Date.parse(p.ends_at) > now && (!p.starts_at || Date.parse(p.starts_at) <= now);

export default function Banners({ c }: { c: Ctx }) {
  const { d, hash, go, reload } = c;
  const toast = useToast();
  const editId = hash.startsWith('banner=') ? hash.slice(7) : '';
  const editing = editId === 'new' ? 'new' : d.promos.find(p => p.id === editId) || null;
  const now = d.now || Date.now();
  const list = [...d.promos].sort((a, b) => (a.sort ?? 100) - (b.sort ?? 100));
  const toggle = async (p: Promo, on: boolean) => { try { await call('/api/admin/promos', { id: p.id, is_on: on }, 'PATCH'); await reload(); toast('ok', on ? 'Banner switched on.' : 'Banner switched off.'); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } };
  const move = async (p: Promo, dir: -1 | 1) => {
    const i = list.indexOf(p); const other = list[i + dir]; if (!other) return;
    try { await call('/api/admin/promos', { id: p.id, sort: (other.sort ?? 100) + (dir > 0 ? 1 : -1) }, 'PATCH'); await call('/api/admin/promos', { id: other.id, sort: p.sort ?? 100 }, 'PATCH'); await reload(); } catch (e) { toast('err', 'Couldn’t reorder.', (e as Error).message); }
  };
  const sliderOn = d.settings.slider?.on !== false;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
          <Switch on={sliderOn} label="Show the slider on the home page" onChange={async v => { try { await call('/api/admin/settings', { key: 'slider', value: { on: v, seconds: d.settings.slider?.seconds || 6 } }); await reload(); toast('ok', v ? 'Slider is showing.' : 'Slider is hidden.'); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } }} />
          Show the slider on the home page · changes every {d.settings.slider?.seconds || 6}s
        </span>
        <Btn onClick={() => go('banners', 'banner=new')}>+ Add a banner</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {list.map((p, i) => {
          const on = live(p, now); const ended = Date.parse(p.ends_at) <= now; const notYet = p.starts_at && Date.parse(p.starts_at) > now;
          return (
            <article key={p.id} className="lift" style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <button type="button" className="ub" onClick={() => go('banners', 'banner=' + p.id)} aria-label={`Edit ${p.title}`} style={{ position: 'relative', height: 150, background: p.style === 'color' || !p.img ? p.color || '#0B3A23' : '#0B3A23', overflow: 'hidden', display: 'block' }}>
                {p.img && p.style !== 'color' && <img src={p.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: p.style === 'photo' ? 0.75 : 1 }} />}
                {p.style !== 'image' && <span className="serif" style={{ position: 'absolute', left: 16, bottom: 14, right: 16, fontSize: 21, lineHeight: 1.15, color: '#FFFFFF', textShadow: '0 2px 12px rgba(0,0,0,.3)' }}>{p.title}</span>}
              </button>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>{on ? <Pill bg="#E6EEE8" fg="#0B3A23">Showing now</Pill> : ended ? <Pill>Ended</Pill> : notYet ? <Pill bg="#F6E9CF" fg="#6B4A12">Starts {new Date(p.starts_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Pill> : <Pill>Off</Pill>}</span>
                  <span style={{ fontSize: 12, color: '#66736B' }}>Until {new Date(p.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · goes to {href(p.link_type || 'product', p.link_to || p.product_id)}</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <button type="button" className="ub" aria-label="Move earlier" disabled={i === 0} onClick={() => move(p, -1)} style={{ width: 26, height: 20, opacity: i === 0 ? 0.3 : 1, textAlign: 'center' }}>▲</button>
                  <button type="button" className="ub" aria-label="Move later" disabled={i === list.length - 1} onClick={() => move(p, 1)} style={{ width: 26, height: 20, opacity: i === list.length - 1 ? 0.3 : 1, textAlign: 'center' }}>▼</button>
                </span>
                <Switch on={p.is_on} label={`Show ${p.title}`} onChange={v => toggle(p, v)} />
              </div>
            </article>
          );
        })}
      </div>
      {!list.length && <section style={card}><Empty title="No banners yet." text="Add one for a sale, new stock, a holiday notice or anything else you want people to see."><Btn onClick={() => go('banners', 'banner=new')}>Add a banner</Btn></Empty></section>}
      {editing && <Editor c={c} p={editing === 'new' ? null : editing} onClose={() => go('banners')} />}
    </div>
  );
}

function Editor({ c, p, onClose }: { c: Ctx; p: Promo | null; onClose: () => void }) {
  const { d, reload } = c;
  const toast = useToast();
  const [f, setF] = useState(() => ({
    title: p?.title || '', eyebrow: p?.eyebrow || '', text: p?.text || '', button: p?.button || 'Shop now', style: (p?.style || 'photo') as 'photo' | 'color' | 'image',
    color: p?.color || '#0B3A23', shade: p?.shade ?? 0.85, img: p?.img || '', link_type: p?.link_type || 'product', link_to: p?.link_to || p?.product_id || d.products[0]?.id || '',
    start: (p?.starts_at || new Date().toISOString()).slice(0, 10), end: (p?.ends_at || plus(14) + 'T23:59:00Z').slice(0, 10), is_on: p?.is_on ?? true,
  }));
  const [busy, setBusy] = useState(false); const [up, setUp] = useState(false); const [err, setErr] = useState(''); const [del, setDel] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }));
  const upload = async (fl: File) => { setUp(true); setErr(''); try { const r = await call<{ url: string }>('/api/admin/upload', { dataUrl: await prepImage(fl, 'wide'), folder: 'banners' }); set('img', r.url); } catch (e) { setErr((e as Error).message); } finally { setUp(false); } };
  const save = async () => {
    setBusy(true); setErr('');
    try {
      await call('/api/admin/promos', { id: p?.id, title: f.title, eyebrow: f.eyebrow, text: f.text, button: f.button, style: f.style, color: f.color, shade: Number(f.shade), img: f.style === 'color' ? null : f.img || null,
        link_type: f.link_type, link_to: f.link_type === 'deals' ? null : f.link_to, starts_at: new Date(f.start + 'T00:00:00+01:00').toISOString(), ends_at: new Date(f.end + 'T23:59:00+01:00').toISOString(), is_on: f.is_on, sort: p?.sort ?? (d.promos.length + 1) * 10 });
      await reload(); toast('ok', p ? 'Banner saved.' : 'Banner added.', 'It shows on the home page within a minute.'); onClose();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => { try { await call('/api/admin/promos?id=' + p!.id, undefined, 'DELETE'); await reload(); toast('ok', 'Banner deleted.'); onClose(); } catch (e) { setErr((e as Error).message); setDel(false); } };
  const preview = [{ id: 'x', kicker: f.eyebrow, title: f.title || 'Your headline here', text: f.text, button: f.button, img: f.img || null, style: f.style === 'photo' && !f.img ? 'color' as const : f.style, color: f.color, shade: Number(f.shade), href: '#' }];
  const STY: [typeof f.style, string, string][] = [['photo', 'Photo with colour', 'Your words over a photo'], ['color', 'Plain colour', 'Your words on a colour'], ['image', 'Finished banner', 'A banner you designed']];
  return (
    <Drawer wide title={p ? 'Edit banner' : 'Add a banner'} onClose={onClose} foot={<>
      {p && <Btn kind="text" danger onClick={() => setDel(true)} style={{ marginRight: 'auto' }}>Delete</Btn>}
      <Btn kind="out" onClick={onClose}>Cancel</Btn><Btn disabled={busy || up} onClick={save}>{busy ? 'Saving…' : 'Save banner'}</Btn></>}>
      <div style={{ pointerEvents: 'none', marginTop: -64 }}><Slider slides={preview} /></div>
      <p style={{ margin: '8px 0 18px', fontSize: 12, color: '#66736B', textAlign: 'center' }}>Preview. On phones the small text is hidden.</p>
      <div role="radiogroup" aria-label="Banner type" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        {STY.map(([k, l, s]) => <button key={k} type="button" role="radio" aria-checked={f.style === k} className="ub" onClick={() => set('style', k)} style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${f.style === k ? '#0B3A23' : '#E4DFD3'}`, background: f.style === k ? '#F1F5F1' : '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12, color: '#66736B' }}>{s}</span></button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
        {f.style !== 'color' && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Btn kind="out" onClick={() => file.current?.click()} disabled={up}>{up ? 'Uploading…' : f.img ? 'Change picture' : f.style === 'image' ? 'Upload your banner' : 'Upload a background photo'}</Btn>
            <span style={{ fontSize: 12, color: '#66736B' }}>{f.style === 'image' ? 'Wide picture, 16:9 (for example 1920 × 1080). Your words and logo should be in the picture. It shows whole, never cropped.' : 'Wide photo. Keep the left side calm so the words are easy to read.'}</span>
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) upload(fl); e.target.value = ''; }} />
          </div>
        )}
        {f.style !== 'image' && <>
          <div style={{ ...lab, gridColumn: '1 / -1' }}>Colour
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {SWATCHES.map(s => <button key={s} type="button" className="ub" aria-label={s} aria-pressed={f.color.toUpperCase() === s} onClick={() => set('color', s)} style={{ width: 32, height: 32, borderRadius: '50%', background: s, border: '2px solid #FFFFFF', boxShadow: f.color.toUpperCase() === s ? '0 0 0 2px #0B3A23' : '0 0 0 1px #DCD6CA' }} />)}
              <input type="color" value={f.color} onChange={e => set('color', e.target.value.toUpperCase())} aria-label="Any colour" style={{ width: 40, height: 34, padding: 0, border: 0, background: 'none' }} />
            </div>
          </div>
          {f.style === 'photo' && <label style={{ ...lab, gridColumn: '1 / -1' }}>How strong the colour is over the photo · {Math.round(Number(f.shade) * 100)}%<input type="range" min={0.3} max={1} step={0.05} value={f.shade} onChange={e => set('shade', Number(e.target.value))} /></label>}
          <label style={lab}>Small line on top (optional)<input value={f.eyebrow} maxLength={40} onChange={e => set('eyebrow', e.target.value)} placeholder="This week" style={input} /></label>
          <label style={lab}>Button words<input value={f.button} maxLength={24} onChange={e => set('button', e.target.value)} style={input} /></label>
          <label style={{ ...lab, gridColumn: '1 / -1' }}>Headline<input value={f.title} maxLength={70} onChange={e => set('title', e.target.value)} placeholder="Student combos from ₦5,000" style={input} /></label>
          <label style={{ ...lab, gridColumn: '1 / -1' }}>A short line under it (optional)<input value={f.text} maxLength={140} onChange={e => set('text', e.target.value)} style={input} /></label>
        </>}
        {f.style === 'image' && <label style={{ ...lab, gridColumn: '1 / -1' }}>Name it (for you, and for blind visitors)<input value={f.title} maxLength={70} onChange={e => set('title', e.target.value)} placeholder="Christmas hampers now open" style={input} /></label>}
        <label style={lab}>Tapping it goes to<select value={f.link_type} onChange={e => { set('link_type', e.target.value); set('link_to', e.target.value === 'product' ? d.products[0]?.id || '' : e.target.value === 'aisle' ? 'cereal' : e.target.value === 'url' ? 'https://' : ''); }} style={input}><option value="product">A product</option><option value="aisle">An aisle</option><option value="deals">Deals page</option><option value="url">Another web page</option></select></label>
        {f.link_type === 'product' && <label style={lab}>Product<select value={f.link_to} onChange={e => set('link_to', e.target.value)} style={input}>{d.products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
        {f.link_type === 'aisle' && <label style={lab}>Aisle<select value={f.link_to} onChange={e => set('link_to', e.target.value)} style={input}>{Object.entries(AISLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
        {f.link_type === 'url' && <label style={lab}>Web address<input value={f.link_to} onChange={e => set('link_to', e.target.value)} placeholder="https://www.tiktok.com/@tiadamarketplace" style={input} /></label>}
        <label style={lab}>Show from<input type="date" value={f.start} min={p ? undefined : today()} onChange={e => set('start', e.target.value)} style={input} /></label>
        <label style={lab}>Until<input type="date" value={f.end} min={f.start} onChange={e => set('end', e.target.value)} style={input} /></label>
        <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch on={f.is_on} label="Switched on" onChange={v => set('is_on', v)} />Switched on</label>
      </div>
      {err && <p role="alert" style={{ margin: '14px 0 0', padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5 }}>{err}</p>}
      {del && <Confirm title="Delete this banner?" text="It comes off the home page straight away." yes="Delete" danger onNo={() => setDel(false)} onYes={remove} />}
    </Drawer>
  );
}
