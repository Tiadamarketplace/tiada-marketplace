'use client';
import { useRef, useState } from 'react';
import type { Ctx } from './Desk';
import type { Popup } from './types';
import { card, Btn, Drawer, Confirm, Empty, Switch, Pill, call, useToast, input, lab, prepImage, AISLE } from './ui';

const WHO: Record<Popup['audience'], [string, string]> = { all: ['Everyone', 'All shoppers'], visitors: ['Visitors', 'People not signed in, e.g. a first-order discount'], customers: ['Signed-in customers', 'People with an account, e.g. a thank-you deal'] };
const OFTEN: Record<Popup['freq'], [string, string]> = { once: ['Once', 'Each person sees it one time'], daily: ['Once a day', 'Again the next day if it’s still on'], visit: ['Every visit', 'Each time they come back to the site'] };
const local = (iso: string) => { const d = new Date(new Date(iso).getTime() + 3600e3); return d.toISOString().slice(0, 16); }; // Lagos time in the box
const fromLocal = (v: string) => new Date(v + ':00+01:00').toISOString();
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' });
const isLive = (p: Popup, now: number) => p.is_on && Date.parse(p.ends_at) > now && Date.parse(p.starts_at) <= now;

export default function Popups({ c }: { c: Ctx }) {
  const { d, hash, go, reload } = c;
  const toast = useToast();
  const editId = hash.startsWith('popup=') ? hash.slice(6) : '';
  const editing = editId === 'new' ? 'new' : d.popups.find(p => p.id === editId) || null;
  const now = d.now || Date.now();
  const toggle = async (p: Popup, on: boolean) => { try { await call('/api/admin/popups', { id: p.id, is_on: on }, 'PATCH'); await reload(); toast('ok', on ? 'Pop-up switched on.' : 'Pop-up switched off.'); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } };
  const showing = d.popups.filter(p => isLive(p, now));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 13.5, color: '#4D5A52', maxWidth: 620, lineHeight: 1.55 }}>If more than one is showing, each shopper sees the newest one meant for them. Pop-ups wait until the “We repack” notice has been closed, so new visitors never get two at once.</span>
        <Btn onClick={() => go('popups', 'popup=new')}>+ Add a pop-up</Btn>
      </div>
      {showing.length > 1 && <p style={{ margin: 0, fontSize: 13, color: '#6B4A12', background: '#FBF3E2', padding: '10px 12px', borderRadius: 8 }}>{showing.length} pop-ups are on at the same time. That’s fine if they’re for different people; otherwise switch the older ones off.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {d.popups.map(p => {
          const on = isLive(p, now), ended = Date.parse(p.ends_at) <= now, notYet = Date.parse(p.starts_at) > now;
          return (
            <article key={p.id} className="lift" style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <button type="button" className="ub" onClick={() => go('popups', 'popup=' + p.id)} aria-label={`Edit ${p.title}`} style={{ position: 'relative', height: 170, background: '#F4F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {p.img ? <img src={p.img} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ padding: 18, fontSize: 15, fontWeight: 600, textAlign: 'center' }}>{p.text}</span>}
              </button>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                  <span>{on ? <Pill bg="#E6EEE8" fg="#0B3A23">Showing now</Pill> : ended ? <Pill>Ended</Pill> : notYet ? <Pill bg="#F6E9CF" fg="#6B4A12">Starts {when(p.starts_at)}</Pill> : <Pill>Off</Pill>}</span>
                  <span style={{ fontSize: 12, color: '#66736B' }}>{WHO[p.audience][0]} · {OFTEN[p.freq][0].toLowerCase()} · until {when(p.ends_at)}</span>
                </span>
                <Switch on={p.is_on} label={`Show ${p.title}`} onChange={v => toggle(p, v)} />
              </div>
            </article>
          );
        })}
      </div>
      {!d.popups.length && <section style={card}><Empty title="No pop-ups yet." text="Add one for a discount, a holiday sale, new stock or a notice. It pops up over the shop for the time you choose."><Btn onClick={() => go('popups', 'popup=new')}>Add a pop-up</Btn></Empty></section>}
      {editing && <Editor c={c} p={editing === 'new' ? null : editing} onClose={() => go('popups')} />}
    </div>
  );
}

function Editor({ c, p, onClose }: { c: Ctx; p: Popup | null; onClose: () => void }) {
  const { d, reload } = c;
  const toast = useToast();
  const kind0 = !p?.href ? 'none' : p.href.startsWith('/p/') ? 'product' : p.href.startsWith('/aisle/deals') ? 'deals' : p.href.startsWith('/aisle/') ? 'aisle' : 'url';
  const [f, setF] = useState(() => ({
    title: p?.title || '', text: p?.text || '', img: p?.img || '', button: p?.button || 'Shop now',
    link: kind0 as 'none' | 'product' | 'aisle' | 'deals' | 'url', to: kind0 === 'product' ? p!.href.slice(3) : kind0 === 'aisle' ? p!.href.slice(7) : kind0 === 'url' ? p!.href : '',
    audience: (p?.audience || 'all') as Popup['audience'], freq: (p?.freq || 'once') as Popup['freq'], delay: p?.delay ?? 3,
    start: local(p?.starts_at || new Date().toISOString()), end: local(p?.ends_at || new Date(Date.now() + 7 * 864e5).toISOString()), is_on: p?.is_on ?? true,
  }));
  const [busy, setBusy] = useState(false); const [up, setUp] = useState(false); const [err, setErr] = useState(''); const [del, setDel] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }));
  const upload = async (fl: File) => { setUp(true); setErr(''); try { const r = await call<{ url: string }>('/api/admin/upload', { dataUrl: await prepImage(fl, 'wide'), folder: 'popups' }); set('img', r.url); } catch (e) { setErr((e as Error).message); } finally { setUp(false); } };
  const href = f.link === 'product' ? `/p/${f.to}` : f.link === 'aisle' ? `/aisle/${f.to}` : f.link === 'deals' ? '/aisle/deals' : f.link === 'url' ? f.to : '';
  const quick = (days: number) => { set('start', local(new Date().toISOString())); set('end', local(new Date(Date.now() + days * 864e5).toISOString())); };
  const save = async () => {
    setBusy(true); setErr('');
    try {
      await call('/api/admin/popups', { id: p?.id, title: f.title, text: f.text, img: f.img || null, button: href ? f.button : '', href, audience: f.audience, freq: f.freq, delay: Number(f.delay), starts_at: fromLocal(f.start), ends_at: fromLocal(f.end), is_on: f.is_on });
      await reload(); toast('ok', p ? 'Pop-up saved.' : 'Pop-up added.', 'It shows in the shop within a minute.'); onClose();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => { try { await call('/api/admin/popups?id=' + p!.id, undefined, 'DELETE'); await reload(); toast('ok', 'Pop-up deleted.'); onClose(); } catch (e) { setErr((e as Error).message); setDel(false); } };
  const radio = <K extends 'audience' | 'freq'>(k: K, opts: Record<string, [string, string]>, label: string) => (
    <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
      {Object.entries(opts).map(([v, [l, s]]) => <button key={v} type="button" role="radio" aria-checked={f[k] === v} className="ub" onClick={() => set(k, v as (typeof f)[K])} style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${f[k] === v ? '#0B3A23' : '#E4DFD3'}`, background: f[k] === v ? '#F1F5F1' : '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{l}</span><span style={{ fontSize: 12, color: '#66736B' }}>{s}</span></button>)}
    </div>
  );
  return (
    <Drawer wide title={p ? 'Edit pop-up' : 'Add a pop-up'} onClose={onClose} foot={<>
      {p && <Btn kind="text" danger onClick={() => setDel(true)} style={{ marginRight: 'auto' }}>Delete</Btn>}
      <Btn kind="out" onClick={onClose}>Cancel</Btn><Btn disabled={busy || up} onClick={save}>{busy ? 'Saving…' : 'Save pop-up'}</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) 1fr', gap: 16, alignItems: 'start' }} className="pp-grid">
        <div style={{ background: '#1F2A23', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} aria-label="Preview">
          <div style={{ width: '100%', background: '#FFFFFF', borderRadius: 8, overflow: 'hidden' }}>
            {f.img ? <img src={f.img} alt="" style={{ width: '100%', display: 'block' }} /> : <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8B958E' }}>Your picture</div>}
            {(f.text || href) && <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>{f.text && <span style={{ fontSize: 12, lineHeight: 1.45 }}>{f.text}</span>}{href && <span style={{ height: 28, borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.button || 'Shop now'}</span>}</div>}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>Preview</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <Btn kind="out" onClick={() => file.current?.click()} disabled={up}>{up ? 'Uploading…' : f.img ? 'Change picture' : 'Upload picture'}</Btn>
            {f.img && <Btn kind="text" small onClick={() => set('img', '')}>Remove</Btn>}
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) upload(fl); e.target.value = ''; }} />
          </div>
          <span style={{ fontSize: 12, color: '#66736B', lineHeight: 1.5 }}>Square or upright works best on phones, for example 1080 × 1080 or 1080 × 1350. Put your offer and logo in the picture. It shows whole, never cropped.</span>
          <label style={lab}>Name it (for you, and for blind visitors)<input value={f.title} maxLength={70} onChange={e => set('title', e.target.value)} placeholder="Christmas sale, 10% off" style={input} /></label>
          <label style={lab}>Words under the picture (optional)<input value={f.text} maxLength={200} onChange={e => set('text', e.target.value)} placeholder="Use code XMAS10 at checkout. Ends Sunday." style={input} /></label>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
        <label style={lab}>Button goes to<select value={f.link} onChange={e => { const v = e.target.value as typeof f.link; set('link', v); set('to', v === 'product' ? d.products[0]?.id || '' : v === 'aisle' ? 'cereal' : v === 'url' ? 'https://' : ''); }} style={input}><option value="none">No button</option><option value="product">A product</option><option value="aisle">An aisle</option><option value="deals">Deals page</option><option value="url">Another web page</option></select></label>
        {f.link === 'product' && <label style={lab}>Product<select value={f.to} onChange={e => set('to', e.target.value)} style={input}>{d.products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
        {f.link === 'aisle' && <label style={lab}>Aisle<select value={f.to} onChange={e => set('to', e.target.value)} style={input}>{Object.entries(AISLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
        {f.link === 'url' && <label style={lab}>Web address<input value={f.to} onChange={e => set('to', e.target.value)} placeholder="https://" style={input} /></label>}
        {f.link !== 'none' && <label style={lab}>Button words<input value={f.button} maxLength={24} onChange={e => set('button', e.target.value)} style={input} /></label>}
      </div>
      <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>Who sees it</h3>
      {radio('audience', WHO, 'Who sees it')}
      <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>How often</h3>
      {radio('freq', OFTEN, 'How often')}
      <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>When it runs</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {[[1, '1 day'], [3, '3 days'], [7, '1 week'], [14, '2 weeks'], [30, '1 month']].map(([n, l]) => <button key={n} type="button" className="ub chip" onClick={() => quick(n as number)} style={{ height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid #DCD6CA', fontSize: 12.5 }}>From now, {l}</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <label style={lab}>Starts (Lagos time)<input type="datetime-local" value={f.start} onChange={e => set('start', e.target.value)} style={input} /></label>
        <label style={lab}>Ends (Lagos time)<input type="datetime-local" value={f.end} min={f.start} onChange={e => set('end', e.target.value)} style={input} /></label>
        <label style={lab}>Pops up after<select value={f.delay} onChange={e => set('delay', Number(e.target.value))} style={input}>{[0, 3, 5, 10, 20, 30].map(s => <option key={s} value={s}>{s ? `${s} seconds on the site` : 'Straight away'}</option>)}</select></label>
        <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch on={f.is_on} label="Switched on" onChange={v => set('is_on', v)} />Switched on</label>
      </div>
      {err && <p role="alert" style={{ margin: '14px 0 0', padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5 }}>{err}</p>}
      {del && <Confirm title="Delete this pop-up?" text="It stops showing straight away." yes="Delete" danger onNo={() => setDel(false)} onYes={remove} />}
    </Drawer>
  );
}
