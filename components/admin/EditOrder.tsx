'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import type { Item, Order } from './types';
import { Btn, call, input, lab, naira, useToast } from './ui';

/**
 * Change an order after it was placed: customer details, address, items, quantities, prices and delivery fee.
 * Money isn't moved here: if the total goes down, use Refund; if it goes up, collect the difference from the customer.
 */
export default function EditOrder({ c, o, onDone }: { c: Ctx; o: Order; onDone: () => void }) {
  const { d, reload } = c;
  const toast = useToast();
  const [f, setF] = useState({ name: o.name, phone: o.phone, email: o.email, address: o.address, landmark: o.landmark || '', note: o.note || '', fee: String(o.delivery_fee) });
  const [items, setItems] = useState<Item[]>(o.items.map(x => ({ ...x })));
  const [add, setAdd] = useState({ pid: '', size: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f, v: string) => setF(x => ({ ...x, [k]: v }));
  const setItem = (i: number, k: 'qty' | 'price', v: string) => setItems(x => x.map((it, j) => (j === i ? { ...it, [k]: Number(v.replace(/\D/g, '')) || 0 } : it)));
  const paid = o.paid ?? o.total;
  const sub = items.reduce((a, it) => a + it.price * it.qty, 0);
  const total = sub - Math.min(o.discount || 0, sub) + (Number(f.fee) || 0);
  const diff = total - paid;
  const prod = d.products.find(p => p.id === add.pid);
  const sizes = prod ? prod.sizes.filter(s => !s.na && s.price) : [];
  const addItem = () => {
    const s = sizes.find(x => x.label === add.size) || sizes[0];
    if (!prod || !s) return;
    const now = s.sale && s.sale < (s.price || 0) ? s.sale : s.price || 0;
    setItems(x => { const i = x.findIndex(it => it.pid === prod.id && it.size === s.label); return i >= 0 ? x.map((it, j) => (j === i ? { ...it, qty: it.qty + 1 } : it)) : x.concat({ pid: prod.id, name: prod.name, size: s.label, qty: 1, price: now, kg: s.kg, img: prod.img }); });
    setAdd({ pid: '', size: '' });
  };
  const save = async () => {
    setErr('');
    if (!items.length) return setErr('An order needs at least one item. To drop everything, cancel the order instead.');
    if (items.some(it => it.qty < 1)) return setErr('Every item needs a quantity of at least 1. Use Remove to take one out.');
    setBusy(true);
    try {
      await call(`/api/admin/orders/${o.id}`, { action: 'edit', name: f.name, phone: f.phone, email: f.email, address: f.address, landmark: f.landmark || null, note: f.note || null, delivery_fee: Number(f.fee) || 0, items });
      await reload(); toast('ok', `${o.id} updated.`, diff < 0 ? `Refund ${naira(-diff)} with the Refund button.` : diff > 0 ? `Collect ${naira(diff)} more from ${o.name.split(' ')[0]}.` : ''); onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const box: React.CSSProperties = { marginTop: 14, padding: 16, borderRadius: 12, background: '#FBF9F4', border: '1px solid #ECE8DF', display: 'flex', flexDirection: 'column', gap: 12 };
  const cell: React.CSSProperties = { ...input, height: 40, padding: '0 10px' };
  return (
    <div style={box} className="fade">
      <strong>Edit order</strong>
      <p style={{ margin: 0, fontSize: 13, color: '#4D5A52', lineHeight: 1.55 }}>Change anything below and press Save changes. No money moves here, and the customer isn’t emailed: use Refund or Email the customer after if you need to.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        <label style={lab}>Name<input value={f.name} onChange={e => set('name', e.target.value)} style={input} /></label>
        <label style={lab}>Phone<input value={f.phone} onChange={e => set('phone', e.target.value)} inputMode="tel" style={input} /></label>
        <label style={lab}>Email<input value={f.email} onChange={e => set('email', e.target.value)} inputMode="email" style={input} /></label>
        <label style={{ ...lab, gridColumn: '1 / -1' }}>Address<input value={f.address} onChange={e => set('address', e.target.value)} style={input} /></label>
        <label style={{ ...lab, gridColumn: '1 / -1' }}>House number, flat or landmark<input value={f.landmark} onChange={e => set('landmark', e.target.value)} style={input} /></label>
        <label style={{ ...lab, gridColumn: '1 / -1' }}>Customer’s note<input value={f.note} onChange={e => set('note', e.target.value)} style={input} /></label>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B958E', marginTop: 4 }}>Items</div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 76px 110px auto', gap: 8, alignItems: 'end' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, alignSelf: 'center', minWidth: 0 }}>{it.name}{it.size !== 'Package' && <span style={{ color: '#66736B', fontWeight: 400 }}> · {it.size}</span>}</span>
          <label style={{ ...lab, fontSize: 11.5 }}>Qty<input value={it.qty || ''} onChange={e => setItem(i, 'qty', e.target.value)} inputMode="numeric" style={cell} /></label>
          <label style={{ ...lab, fontSize: 11.5 }}>Price each ₦<input value={it.price} onChange={e => setItem(i, 'price', e.target.value)} inputMode="numeric" style={cell} /></label>
          <Btn kind="text" small danger onClick={() => setItems(x => x.filter((_, j) => j !== i))}>Remove</Btn>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
        <label style={{ ...lab, flex: '1 1 200px' }}>Add a product<select value={add.pid} onChange={e => setAdd({ pid: e.target.value, size: '' })} style={input}><option value="">Choose…</option>{d.products.filter(p => p.sizes.some(s => !s.na && s.price)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {sizes.length > 1 && <label style={{ ...lab, flex: '0 1 140px' }}>Size<select value={add.size || sizes[0].label} onChange={e => setAdd(x => ({ ...x, size: e.target.value }))} style={input}>{sizes.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}</select></label>}
        <Btn kind="out" disabled={!prod} onClick={addItem}>Add</Btn>
      </div>
      <label style={{ ...lab, maxWidth: 220 }}>Delivery fee ₦<input value={f.fee} onChange={e => set('fee', e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={input} /></label>

      <div style={{ padding: '10px 12px', borderRadius: 8, background: diff ? '#FBF2DE' : '#E6EEE8', color: diff ? '#5C430F' : '#0B3A23', fontSize: 13.5, lineHeight: 1.6 }}>
        New total {naira(total)} · they paid {naira(paid)}.{' '}
        {diff < 0 ? <strong>After saving, refund {naira(-diff)} with the Refund button.</strong> : diff > 0 ? <strong>{o.name.split(' ')[0]} owes {naira(diff)} more: collect it before delivery.</strong> : 'No money to sort out.'}
      </div>
      {err && <p role="alert" style={{ margin: 0, padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Btn kind="text" onClick={onDone}>Cancel</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</Btn></div>
    </div>
  );
}
