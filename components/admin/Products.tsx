'use client';
import { useMemo, useRef, useState } from 'react';
import type { Ctx } from './Desk';
import type { Product, Size } from './types';
import { naira, card, Btn, Tabs, Drawer, Confirm, Empty, Switch, Pill, call, useToast, input, lab, prepImage, AISLE } from './ui';

type Tab = 'all' | 'shown' | 'hidden' | 'low';
const STATUS: Record<string, string> = { in: 'In stock', fast: 'Fast selling', out: 'Sold out', na: 'Not available' };
const DEFAULT_SIZES: Size[] = ['250g', '500g', '1kg', '2kg', '1 paint'].map((l, i) => ({ label: l, price: null, sale: null, kg: [0.25, 0.5, 1, 2, 2.5][i], na: false, stock: 0 }));
const isCombo = (cat: string) => cat === 'ccombo' || cat === 'fcombo';

export default function Products({ c }: { c: Ctx }) {
  const { d, hash, go, setD } = c;
  const toast = useToast();
  const h = hash.startsWith('products=') ? hash.slice(9) : '';
  const [tab, setTab] = useState<Tab>(h === 'low' ? 'low' : 'all');
  const [aisle, setAisle] = useState('');
  const [q, setQ] = useState('');
  const editId = hash.startsWith('product=') ? hash.slice(8) : '';
  const editing = editId === 'new' ? 'new' : d.products.find(p => p.id === editId) || null;
  const lowOf = (p: Product) => p.sizes.filter(s => !s.na && s.stock != null && s.stock <= (p.low || 3));
  const list = useMemo(() => d.products.filter(p => (tab === 'all' || (tab === 'shown' ? !p.hidden : tab === 'hidden' ? p.hidden : lowOf(p).length > 0)) && (!aisle || p.cat === aisle) && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))), [d.products, tab, aisle, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const put = (id: string, fn: (p: Product) => Product) => setD(x => (x ? { ...x, products: x.products.map(y => (y.id === id ? fn(y) : y)) } : x));
  const patch = async (p: Product, body: Record<string, unknown>, msg?: string) => {
    // show the change straight away; go back if it doesn't save
    if ('hidden' in body) put(p.id, y => ({ ...y, hidden: !!body.hidden }));
    try {
      const r = await call<{ product: Product }>('/api/admin/products', { id: p.id, ...body }, 'PATCH');
      if (!pend.current.size) put(p.id, () => r.product);
      if (msg) toast('ok', msg);
    } catch (e) { if ('hidden' in body) put(p.id, y => ({ ...y, hidden: p.hidden })); toast('err', 'That didn’t save.', (e as Error).message); }
  };
  // + and − change the number at once; quick taps are added up and saved together
  const pend = useRef(new Map<string, { p: Product; size: string; delta: number; t: ReturnType<typeof setTimeout> }>());
  const bump = (p: Product, size: string, by: number) => {
    const cur = d.products.find(x => x.id === p.id)?.sizes.find(x => x.label === size)?.stock ?? 0;
    if (cur + by < 0) return;
    put(p.id, y => ({ ...y, sizes: y.sizes.map(z => (z.label === size ? { ...z, stock: (z.stock ?? 0) + by } : z)) }));
    const k = p.id + '|' + size; const was = pend.current.get(k);
    if (was) clearTimeout(was.t);
    const e = { p, size, delta: (was?.delta || 0) + by, t: setTimeout(async () => {
      const job = pend.current.get(k); if (!job) return; pend.current.delete(k);
      if (!job.delta) return;
      try {
        const r = await call<{ product: Product }>('/api/admin/products', { id: p.id, size, stockDelta: job.delta }, 'PATCH');
        if (![...pend.current.keys()].some(x => x.startsWith(p.id + '|'))) put(p.id, () => r.product);
      } catch (err) {
        put(p.id, y => ({ ...y, sizes: y.sizes.map(z => (z.label === size ? { ...z, stock: Math.max(0, (z.stock ?? 0) - job.delta) } : z)) }));
        toast('err', 'Stock didn’t save.', (err as Error).message);
      }
    }, 450) };
    pend.current.set(k, e);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <Tabs value={tab} onChange={setTab} tabs={[['all', 'All', d.products.length], ['shown', 'In the shop'], ['hidden', 'Hidden'], ['low', 'Low or sold out', d.products.filter(p => lowOf(p).length).length]]} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select value={aisle} onChange={e => setAisle(e.target.value)} aria-label="Aisle" style={{ ...input, width: 180, height: 40 }}><option value="">Every aisle</option>{Object.entries(AISLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Find a product" aria-label="Find a product" style={{ ...input, width: 180, height: 40 }} />
          <Btn onClick={() => go('products', 'product=new')}>+ Add product</Btn>
        </div>
      </div>
      <section style={{ ...card, overflow: 'hidden' }}>
        <div className="grid-p adesk" style={{ padding: '12px 18px', borderBottom: '1px solid #ECE8DF', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B958E' }}><span>Product</span><span>Aisle</span><span>Stock for each size</span><span>Status</span><span>Shop</span></div>
        {list.map(p => {
          const sizes = p.sizes.filter(s => !s.na);
          return (
            <div key={p.id} className="grid-p tdrow" style={{ padding: '14px 18px', borderBottom: '1px solid #F0ECE3' }}>
              <button type="button" className="ub c-p" onClick={() => go('products', 'product=' + p.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, textAlign: 'left' }}>
                <span style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: '#F6F1E7', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.img ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="serif" style={{ color: '#8A5F1C', fontSize: 18 }}>{p.name[0]}</span>}</span>
                <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{p.name}</span><span style={{ fontSize: 12, color: '#66736B' }}>{sizes.length > 1 ? `${naira(Math.min(...sizes.map(s => s.sale || s.price || 0)))} to ${naira(Math.max(...sizes.map(s => s.price || 0)))}` : naira(sizes[0]?.sale || sizes[0]?.price || 0)}{p.hidden ? ' · hidden' : ''}</span></span>
              </button>
              <span className="c-aisle" style={{ color: '#4D5A52', fontSize: 13 }}>{AISLE[p.cat] || p.cat}</span>
              <span className="c-stock" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sizes.map(s => { const n = s.stock ?? null; const w = d.waiting[p.id + '|' + s.label] || 0; const low = n != null && n <= (p.low || 3); return (
                  <span key={s.label} title={w ? `${w} waiting for this` : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 32, padding: '0 2px 0 10px', borderRadius: 8, border: `1px solid ${n === 0 ? '#E7C3B9' : low ? '#EAD3A6' : '#E4DFD3'}`, background: n === 0 ? '#FBEFEB' : low ? '#FBF2DE' : '#FFFFFF', fontSize: 12.5 }}>
                    <span style={{ color: '#66736B' }}>{s.label === 'Package' ? 'Stock' : s.label}</span><strong style={{ minWidth: 22, textAlign: 'center' }}>{n ?? '–'}</strong>
                    {w > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#8A5F1C' }}>·{w}</span>}
                    <button type="button" className="ub" aria-label={`One less ${p.name} ${s.label}`} onClick={() => bump(p, s.label, -1)} style={{ width: 24, height: 26, textAlign: 'center', borderRadius: 6, color: '#66736B' }}>−</button>
                    <button type="button" className="ub" aria-label={`One more ${p.name} ${s.label}`} onClick={() => bump(p, s.label, 1)} style={{ width: 24, height: 26, textAlign: 'center', borderRadius: 6, color: '#0B3A23', fontWeight: 700 }}>+</button>
                  </span>); })}
              </span>
              <span className="c-stat"><Pill bg={p.status === 'out' ? '#FBEFEB' : p.status === 'fast' ? '#F6E9CF' : p.status === 'na' ? '#EFEDE6' : '#E6EEE8'} fg={p.status === 'out' ? '#7A2A1B' : p.status === 'fast' ? '#6B4A12' : p.status === 'na' ? '#4D5A52' : '#0B3A23'}>{STATUS[p.status]}</Pill></span>
              <span className="c-sw"><Switch on={!p.hidden} label={`Show ${p.name} in the shop`} onChange={v => patch(p, { hidden: !v }, v ? `${p.name} is in the shop.` : `${p.name} is hidden.`)} /></span>
            </div>
          );
        })}
        {!list.length && <Empty title="No products here." text={tab === 'low' ? 'Nothing is running low. Nice.' : 'Try another filter, or add a product.'} />}
      </section>
      <p style={{ margin: 0, fontSize: 12.5, color: '#66736B' }}>The small gold number next to a size is how many people asked to be told when it’s back. Adding stock emails them automatically.</p>
      {editing && <Editor c={c} p={editing === 'new' ? null : editing} onClose={() => go('products')} toast={toast} />}
    </div>
  );
}

function Editor({ c, p, onClose, toast }: { c: Ctx; p: Product | null; onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const { reload } = c;
  const [f, setF] = useState(() => ({
    name: p?.name || '', cat: p?.cat || 'cereal', img: p?.img || '', status: p?.status || 'in', low: p?.low ?? 3, hidden: p?.hidden ?? false,
    items: (p?.items || []).join('\n'),
    sizes: p ? p.sizes.map(s => ({ ...s, stock: s.stock ?? 0 })) : DEFAULT_SIZES.map(s => ({ ...s })),
  }));
  const [busy, setBusy] = useState(false); const [up, setUp] = useState(false); const [err, setErr] = useState(''); const [del, setDel] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const combo = isCombo(f.cat);
  const setSize = (i: number, k: keyof Size, v: string | boolean) => setF(x => ({ ...x, sizes: x.sizes.map((s, j) => (j !== i ? s : { ...s, [k]: k === 'label' ? v : k === 'na' ? v : v === '' ? null : Number(v) })) }));
  const upload = async (fl: File) => {
    setUp(true); setErr('');
    try { const dataUrl = await prepImage(fl, 'square'); const r = await call<{ url: string }>('/api/admin/upload', { dataUrl, folder: 'products' }); setF(x => ({ ...x, img: r.url })); }
    catch (e) { setErr((e as Error).message); } finally { setUp(false); }
  };
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const sizes = (combo ? f.sizes.slice(0, 1) : f.sizes).filter(s => s.label.trim()).map(s => ({ label: s.label.trim(), price: s.price || null, sale: s.sale || null, kg: Number(s.kg) || 0, na: !s.price, stock: s.stock == null ? null : Number(s.stock) }));
      await call('/api/admin/products', { id: p?.id, name: f.name, cat: f.cat, img: f.img || null, status: f.status, low: Number(f.low) || 0, hidden: f.hidden, items: combo ? f.items.split('\n').map(x => x.trim()).filter(Boolean) : null, sizes });
      await reload(); toast('ok', p ? 'Saved.' : `${f.name} added.`, 'The shop updates within a minute.'); onClose();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => { try { await call('/api/admin/products?id=' + p!.id, undefined, 'DELETE'); await reload(); toast('ok', `${p!.name} deleted.`); onClose(); } catch (e) { setDel(false); setErr((e as Error).message); } };
  const cell: React.CSSProperties = { ...input, height: 42, padding: '0 10px', fontSize: 15 };
  return (
    <Drawer wide title={p ? p.name : 'Add a product'} sub={p ? AISLE[p.cat] : 'Name, sizes, prices and a photo.'} onClose={onClose} foot={<>
      {p && <Btn kind="text" danger onClick={() => setDel(true)} style={{ marginRight: 'auto' }}>Delete</Btn>}
      <Btn kind="out" onClick={onClose}>Cancel</Btn><Btn disabled={busy || up} onClick={save}>{busy ? 'Saving…' : 'Save product'}</Btn></>}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ width: 170, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="ub" onClick={() => file.current?.click()} style={{ width: 170, height: 170, borderRadius: 12, border: '1.5px dashed #CFC8B9', background: '#FBF9F4', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 13, color: '#66736B' }}>
            {up ? 'Uploading…' : f.img ? <img src={f.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>Add a photo<br /><span style={{ fontSize: 11.5 }}>Square, white background</span></span>}
          </button>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) upload(fl); e.target.value = ''; }} />
          {f.img && <Btn kind="text" small onClick={() => setF(x => ({ ...x, img: '' }))}>Remove photo</Btn>}
        </div>
        <div style={{ flex: '1 1 300px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignContent: 'start' }}>
          <label style={{ ...lab, gridColumn: '1 / -1' }}>Product title<input value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} style={input} /></label>
          <label style={lab}>Aisle<select value={f.cat} onChange={e => setF(x => ({ ...x, cat: e.target.value }))} style={input}>{Object.entries(AISLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label style={lab}>Status<select value={f.status} onChange={e => setF(x => ({ ...x, status: e.target.value }))} style={input}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label style={lab}>Warn me when a size is down to<input type="number" min={0} value={f.low} onChange={e => setF(x => ({ ...x, low: Number(e.target.value) }))} style={input} /></label>
          <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'end', height: 44 }}><Switch on={!f.hidden} label="Show in the shop" onChange={v => setF(x => ({ ...x, hidden: !v }))} />Show in the shop</label>
        </div>
      </div>

      <h3 style={{ margin: '24px 0 4px', fontSize: 15, fontWeight: 600 }}>{combo ? 'Price and stock' : 'Sizes, prices and stock'}</h3>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#66736B' }}>{combo ? 'A combo is sold as one package.' : 'Type a new price and press Save product. Leave the price empty for a size you don’t sell. A sale price must be lower than the price; the shop shows the old price crossed out.'}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(combo ? f.sizes.slice(0, 1) : f.sizes).map((s, i) => (
          <div key={i} style={{ padding: 12, borderRadius: 10, border: `1px solid ${s.price ? '#E4DFD3' : '#EAD3A6'}`, background: s.price ? '#FFFFFF' : '#FFFCF4', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 10, alignItems: 'end' }}>
            {!combo && <label style={{ ...lab, fontSize: 12 }}>Size<input value={s.label} onChange={e => setSize(i, 'label', e.target.value)} placeholder="e.g. 500g" style={cell} /></label>}
            <label style={{ ...lab, fontSize: 12 }}>Price ₦<input value={s.price ?? ''} onChange={e => setSize(i, 'price', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Not sold" style={{ ...cell, fontWeight: 600 }} /></label>
            <label style={{ ...lab, fontSize: 12 }}>Sale price ₦<input value={s.sale ?? ''} onChange={e => setSize(i, 'sale', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="None" style={cell} /></label>
            <label style={{ ...lab, fontSize: 12 }}>Weight kg<input value={s.kg ?? ''} onChange={e => setSize(i, 'kg', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" style={cell} /></label>
            <label style={{ ...lab, fontSize: 12 }}>In stock<input value={s.stock ?? ''} onChange={e => setSize(i, 'stock', e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={cell} /></label>
            {!combo && <Btn kind="text" small danger onClick={() => setF(x => ({ ...x, sizes: x.sizes.filter((_, j) => j !== i) }))}>Remove size</Btn>}
            {!s.price && <span style={{ gridColumn: '1 / -1', fontSize: 12, color: '#8A5F1C' }}>No price, so customers can’t buy this size. Type a price to sell it.</span>}
          </div>
        ))}
      </div>
      {!combo && f.sizes.length < 8 && <Btn kind="text" small onClick={() => setF(x => ({ ...x, sizes: x.sizes.concat([{ label: '', price: null, sale: null, kg: 0, na: false, stock: 0 }]) }))}>+ Add a size</Btn>}
      {combo && <label style={{ ...lab, marginTop: 16 }}>What’s inside (one item per line)<textarea rows={6} value={f.items} onChange={e => setF(x => ({ ...x, items: e.target.value }))} placeholder={'Cornflakes 500g\nPeak milk 400g\nSugar'} /></label>}
      {err && <p role="alert" style={{ margin: '14px 0 0', padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5 }}>{err}</p>}
      {del && <Confirm title={`Delete ${p?.name}?`} text="This removes it for good. If it’s been ordered before, hide it instead." yes="Delete" danger onNo={() => setDel(false)} onYes={remove} />}
    </Drawer>
  );
}
