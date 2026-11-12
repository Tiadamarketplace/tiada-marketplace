'use client';
import { useRef, useState } from 'react';
import type { Ctx } from './Desk';
import type { HeroButton, HeroSettings, HeroSlide } from '@/lib/hero-core';
import Hero from '@/components/shop/Hero';
import { card, Btn, Drawer, Confirm, Switch, Pill, call, useToast, input, lab, prepImage, AISLE } from './ui';

const SWATCHES = ['#0B3A23', '#14532F', '#F6E9CF', '#FBF9F4', '#D49B41', '#7A2A1B', '#20456B', '#1F2A23'];
const LOOKS: [HeroButton['look'], string][] = [['gold', 'Gold button'], ['green', 'Green button'], ['white', 'White button'], ['link', 'Underlined words']];
const LAYOUTS: [HeroSlide['layout'], string, string][] = [
  ['back', 'Picture behind', 'Your photo fills the hero, words on top'],
  ['front', 'Picture beside', 'A colour behind, your picture next to the words'],
  ['image', 'Finished banner', 'A banner you designed, shown whole'],
];
const local = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 3600e3).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v + ':00+01:00').toISOString() : null);
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' });
const status = (s: HeroSlide, now: number) => !s.on ? ['Off', '#F2EFE8', '#4D5A52'] : s.starts && Date.parse(s.starts) > now ? [`Starts ${when(s.starts)}`, '#F6E9CF', '#6B4A12'] : s.ends && Date.parse(s.ends) <= now ? ['Ended', '#F2EFE8', '#4D5A52'] : ['Showing', '#E6EEE8', '#0B3A23'];

export default function HeroAdmin({ c }: { c: Ctx }) {
  const { d, hash, go, reload } = c;
  const toast = useToast();
  const h = d.hero;
  const editId = hash.startsWith('slide=') ? hash.slice(6) : '';
  const editing = editId === 'new' ? 'new' : h.slides.find(s => s.id === editId) || null;
  const now = d.now || Date.now();
  const save = async (next: HeroSettings, msg: string) => {
    try { await call('/api/admin/hero', next); await reload(); toast('ok', msg, 'The home page shows it within a minute.'); return true; }
    catch (e) { toast('err', 'That didn’t save.', (e as Error).message); return false; }
  };
  const move = (i: number, dir: -1 | 1) => { const s = [...h.slides]; const j = i + dir; if (!s[j]) return; [s[i], s[j]] = [s[j], s[i]]; return save({ ...h, slides: s }, 'Order saved.'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>Each slide shows for
          <select value={h.seconds} onChange={e => save({ ...h, seconds: Number(e.target.value) }, 'Saved.')} style={{ ...input, width: 'auto', height: 38 }}>{[4, 5, 6, 7, 8, 10, 12, 15].map(n => <option key={n} value={n}>{n} seconds</option>)}</select>
        </label>
        <Btn onClick={() => go('hero', 'slide=new')}>+ Add a slide</Btn>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: '#66736B', lineHeight: 1.55 }}>With more than one slide showing, it changes by itself, and customers can swipe or tap the dots. Slides show in this order.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        <article style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', height: 150, background: '#0B3A23' }}>
            <img src="/img/hero.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
            <span className="serif" style={{ position: 'absolute', left: 14, bottom: 12, right: 14, fontSize: 18, color: '#FFFFFF', textShadow: '0 2px 10px rgba(0,0,0,.4)' }}>Foodstuffs and cereals, packed for your home.</span>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontWeight: 600, fontSize: 14 }}>Tiada welcome (with the video)</span><span><Pill bg={h.main ? '#E6EEE8' : undefined} fg={h.main ? '#0B3A23' : undefined}>{h.main ? 'Showing first' : 'Off'}</Pill></span></span>
            <Switch on={h.main} label="Show the Tiada welcome slide" onChange={v => save({ ...h, main: v }, v ? 'Welcome slide on.' : 'Welcome slide off.')} />
          </div>
        </article>
        {h.slides.map((s, i) => {
          const [l, bg, fg] = status(s, now);
          return (
            <article key={s.id} className="lift" style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <button type="button" className="ub" onClick={() => go('hero', 'slide=' + s.id)} aria-label={`Edit ${s.title || 'slide'}`} style={{ position: 'relative', height: 150, background: s.layout === 'back' ? '#0B3A23' : s.bg, overflow: 'hidden', display: 'block' }}>
                {s.img && <img src={s.img} alt="" style={{ position: 'absolute', inset: s.layout === 'front' ? '10px 10px 10px 50%' : 0, width: s.layout === 'front' ? '48%' : '100%', height: s.layout === 'front' ? 'calc(100% - 20px)' : '100%', objectFit: s.layout === 'back' ? 'cover' : 'contain', opacity: s.layout === 'back' ? 0.75 : 1 }} />}
                {s.layout !== 'image' && <span className="serif" style={{ position: 'absolute', left: 14, bottom: 12, right: s.layout === 'front' ? '52%' : 14, fontSize: 18, lineHeight: 1.15, color: s.layout === 'back' ? '#FFFFFF' : undefined, textAlign: 'left' }}>{s.title}</span>}
              </button>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || 'Finished banner'}</span>
                  <span><Pill bg={bg} fg={fg}>{l}</Pill></span>
                  <span style={{ fontSize: 12, color: '#66736B' }}>{LAYOUTS.find(x => x[0] === s.layout)?.[1]} · {s.buttons.length} button{s.buttons.length === 1 ? '' : 's'}{s.ends ? ` · until ${when(s.ends)}` : ''}</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <button type="button" className="ub" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)} style={{ width: 26, height: 20, opacity: i === 0 ? 0.3 : 1, textAlign: 'center' }}>▲</button>
                  <button type="button" className="ub" aria-label="Move later" disabled={i === h.slides.length - 1} onClick={() => move(i, 1)} style={{ width: 26, height: 20, opacity: i === h.slides.length - 1 ? 0.3 : 1, textAlign: 'center' }}>▼</button>
                </span>
                <Switch on={s.on} label={`Show ${s.title || 'slide'}`} onChange={v => save({ ...h, slides: h.slides.map(x => (x.id === s.id ? { ...x, on: v } : x)) }, v ? 'Slide on.' : 'Slide off.')} />
              </div>
            </article>
          );
        })}
      </div>
      {editing && <Editor c={c} s={editing === 'new' ? null : editing} save={save} onClose={() => go('hero')} />}
    </div>
  );
}

function linkOptions(c: Ctx): [string, string][] {
  return [
    ['/aisle/all', 'Shop everything'], ...Object.entries(AISLE).map(([k, v]) => ['/aisle/' + k, v] as [string, string]), ['/aisle/deals', 'Deals'],
    ['/help', 'Help and delivery'], ['/track', 'Track an order'], ['/account', 'Sign in / My account'],
    ...c.d.products.map(p => ['/p/' + p.id, 'Product: ' + p.name] as [string, string]),
  ];
}

function Editor({ c, s, save, onClose }: { c: Ctx; s: HeroSlide | null; save: (h: HeroSettings, msg: string) => Promise<boolean>; onClose: () => void }) {
  const h = c.d.hero;
  const [f, setF] = useState<HeroSlide>(() => s || { id: '', on: true, layout: 'back', kicker: '', title: '', text: '', img: null, imgPhone: null, bg: '#0B3A23', buttons: [{ label: 'Shop now', href: '/aisle/all', look: 'gold' }], starts: null, ends: null });
  const [up, setUp] = useState<'' | 'img' | 'imgPhone'>(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [del, setDel] = useState(false);
  const fileA = useRef<HTMLInputElement>(null), fileB = useRef<HTMLInputElement>(null);
  const set = <K extends keyof HeroSlide>(k: K, v: HeroSlide[K]) => setF(x => ({ ...x, [k]: v }));
  const opts = linkOptions(c);
  const upload = async (fl: File, k: 'img' | 'imgPhone') => { setUp(k); setErr(''); try { const r = await call<{ url: string }>('/api/admin/upload', { dataUrl: await prepImage(fl, 'wide'), folder: 'banners' }); set(k, r.url); } catch (e) { setErr((e as Error).message); } finally { setUp(''); } };
  const setBtn = (i: number, b: Partial<HeroButton>) => set('buttons', f.buttons.map((x, j) => (j === i ? { ...x, ...b } : x)));
  const doSave = async () => {
    setBusy(true); setErr('');
    const slides = s ? h.slides.map(x => (x.id === s.id ? f : x)) : [...h.slides, f];
    try { await call('/api/admin/hero', { ...h, slides }); await c.reload(); onClose(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => { if (await save({ ...h, slides: h.slides.filter(x => x.id !== s!.id) }, 'Slide deleted.')) onClose(); };
  return (
    <Drawer wide title={s ? 'Edit slide' : 'Add a slide'} onClose={onClose} foot={<>
      {s && <Btn kind="text" danger onClick={() => setDel(true)} style={{ marginRight: 'auto' }}>Delete</Btn>}
      <Btn kind="out" onClick={onClose}>Cancel</Btn><Btn disabled={busy || !!up} onClick={doSave}>{busy ? 'Saving…' : 'Save slide'}</Btn></>}>
      <div style={{ borderRadius: 10, overflow: 'hidden', pointerEvents: 'none', zoom: 0.62 }} aria-label="Preview"><Hero hero={{ main: false, seconds: 7, slides: [{ ...f, id: 'preview' }] }} /></div>
      <p style={{ margin: '8px 0 16px', fontSize: 12, color: '#66736B', textAlign: 'center' }}>Preview (smaller than on the site)</p>
      <div role="radiogroup" aria-label="Slide type" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        {LAYOUTS.map(([k, l, d]) => <button key={k} type="button" role="radio" aria-checked={f.layout === k} className="ub" onClick={() => set('layout', k)} style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${f.layout === k ? '#0B3A23' : '#E4DFD3'}`, background: f.layout === k ? '#F1F5F1' : '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}><span style={{ fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12, color: '#66736B' }}>{d}</span></button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginTop: 16 }}>
        <div style={{ ...lab, gridColumn: '1 / -1' }}>Picture
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <Btn kind="out" onClick={() => fileA.current?.click()} disabled={!!up}>{up === 'img' ? 'Uploading…' : f.img ? 'Change picture' : 'Upload picture'}</Btn>
            {f.img && f.layout === 'front' && <Btn kind="text" small onClick={() => set('img', null)}>Remove</Btn>}
            <Btn kind="out" onClick={() => fileB.current?.click()} disabled={!!up}>{up === 'imgPhone' ? 'Uploading…' : f.imgPhone ? 'Change phone picture' : 'Add a phone picture (optional)'}</Btn>
            {f.imgPhone && <Btn kind="text" small onClick={() => set('imgPhone', null)}>Remove phone picture</Btn>}
          </div>
          <span style={{ fontWeight: 400, fontSize: 12, color: '#66736B' }}>{f.layout === 'back' ? 'Wide photo, 1920 × 900 or bigger. Keep the left side calm so the words are easy to read.' : f.layout === 'front' ? 'A product photo or cut-out on a plain background works best.' : 'Wide banner, 1920 × 800. Put your words and logo in the picture.'} Phones show the phone picture if you add one (upright, 1080 × 1350).</span>
          <input ref={fileA} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) upload(fl, 'img'); e.target.value = ''; }} />
          <input ref={fileB} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) upload(fl, 'imgPhone'); e.target.value = ''; }} />
        </div>
        {f.layout !== 'back' && (
          <div style={{ ...lab, gridColumn: '1 / -1' }}>Colour behind
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {SWATCHES.map(x => <button key={x} type="button" className="ub" aria-label={x} aria-pressed={f.bg.toUpperCase() === x} onClick={() => set('bg', x)} style={{ width: 32, height: 32, borderRadius: '50%', background: x, border: '2px solid #FFFFFF', boxShadow: f.bg.toUpperCase() === x ? '0 0 0 2px #0B3A23' : '0 0 0 1px #DCD6CA' }} />)}
              <input type="color" value={f.bg} onChange={e => set('bg', e.target.value.toUpperCase())} aria-label="Any colour" style={{ width: 40, height: 34, padding: 0, border: 0, background: 'none' }} />
            </div>
          </div>
        )}
        <label style={{ ...lab, gridColumn: '1 / -1' }}>{f.layout === 'image' ? 'Name it (for blind visitors)' : 'Headline'}<input value={f.title} maxLength={90} onChange={e => set('title', e.target.value)} placeholder="Christmas hampers are here" style={input} /></label>
        {f.layout !== 'image' && <>
          <label style={lab}>Small line on top (optional)<input value={f.kicker} maxLength={50} onChange={e => set('kicker', e.target.value)} placeholder="This week only" style={input} /></label>
          <label style={lab}>A line under the headline (optional)<input value={f.text} maxLength={220} onChange={e => set('text', e.target.value)} style={input} /></label>
        </>}
      </div>
      <h3 style={{ margin: '20px 0 4px', fontSize: 14 }}>Buttons</h3>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#66736B' }}>{f.layout === 'image' ? 'Tapping the banner opens the first button’s link.' : 'Up to 3. Each can go to any page, product or website.'}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {f.buttons.map((b, i) => {
          const known = opts.some(o => o[0] === b.href);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, alignItems: 'end', padding: 12, borderRadius: 10, background: '#FAF8F3' }}>
              <label style={lab}>Words<input value={b.label} maxLength={28} onChange={e => setBtn(i, { label: e.target.value })} style={input} /></label>
              <label style={lab}>Goes to<select value={known ? b.href : 'other'} onChange={e => setBtn(i, { href: e.target.value === 'other' ? 'https://' : e.target.value })} style={input}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}<option value="other">Another web address…</option></select></label>
              {!known && <label style={lab}>Web address<input value={b.href} onChange={e => setBtn(i, { href: e.target.value })} placeholder="https://wa.me/234…" style={input} /></label>}
              <label style={lab}>Look<select value={b.look} onChange={e => setBtn(i, { look: e.target.value as HeroButton['look'] })} style={input}>{LOOKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <Btn kind="text" small danger onClick={() => set('buttons', f.buttons.filter((_, j) => j !== i))}>Remove</Btn>
            </div>
          );
        })}
        {f.buttons.length < 3 && <Btn kind="out" small onClick={() => set('buttons', [...f.buttons, { label: 'Shop now', href: '/aisle/all', look: f.buttons.length ? 'link' : 'gold' }])} style={{ alignSelf: 'flex-start' }}>+ Add a button</Btn>}
      </div>
      <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>When it shows (optional)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <label style={lab}>From (Lagos time)<input type="datetime-local" value={local(f.starts)} onChange={e => set('starts', fromLocal(e.target.value))} style={input} /></label>
        <label style={lab}>Until (Lagos time)<input type="datetime-local" value={local(f.ends)} onChange={e => set('ends', fromLocal(e.target.value))} style={input} /></label>
        <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch on={f.on} label="Switched on" onChange={v => set('on', v)} />Switched on</label>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#66736B' }}>Leave the dates empty to show it until you switch it off.</p>
      {err && <p role="alert" style={{ margin: '14px 0 0', padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5 }}>{err}</p>}
      {del && <Confirm title="Delete this slide?" text="It comes off the home page straight away." yes="Delete" danger onNo={() => setDel(false)} onYes={remove} />}
    </Drawer>
  );
}
