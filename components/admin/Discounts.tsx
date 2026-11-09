'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import type { Voucher } from './types';
import { naira, card, Btn, Drawer, Confirm, Empty, Switch, Pill, call, useToast, input, lab } from './ui';

const desc = (v: Voucher) => `${v.kind === 'pct' ? `${v.value}% off${v.cap ? ` (up to ${naira(v.cap)})` : ''}` : `${naira(v.value)} off`}${v.min_order ? ` orders over ${naira(v.min_order)}` : ''}`;
export default function Discounts({ c }: { c: Ctx }) {
  const { d, hash, go, reload } = c;
  const toast = useToast();
  const editId = hash.startsWith('discount=') ? hash.slice(9) : '';
  const editing = editId === 'new' ? 'new' : d.vouchers.find(v => v.code === editId) || null;
  const used = (code: string) => d.orders.filter(o => o.voucher === code && !['cancelled'].includes(o.status));
  const toggle = async (v: Voucher, on: boolean) => { try { await call('/api/admin/vouchers', { code: v.code, is_on: on }, 'PATCH'); await reload(); toast('ok', on ? `${v.code} is on.` : `${v.code} is paused.`); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn onClick={() => go('discounts', 'discount=new')}>+ Create a code</Btn></div>
      <section style={{ ...card, overflow: 'hidden' }}>
        {d.vouchers.map(v => {
          const u = used(v.code); const ended = v.ends_at && Date.parse(v.ends_at + 'T23:59:59+01:00') < Date.now(); const full = v.max_uses != null && v.used >= v.max_uses;
          return (
            <div key={v.code} className="tdrow" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', padding: '16px 18px', borderBottom: '1px solid #F0ECE3' }}>
              <button type="button" className="ub" onClick={() => go('discounts', 'discount=' + v.code)} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px dashed #D49B41', background: '#FBF6EA', fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, letterSpacing: '0.08em', color: '#0B3A23' }}>{v.code}</button>
              <span style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>{desc(v)}</span><span style={{ fontSize: 12.5, color: '#66736B' }}>{v.once_each ? 'Once per customer' : 'Can be reused'}{v.ends_at ? ` · ends ${new Date(v.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}{v.max_uses ? ` · ${v.used} of ${v.max_uses} used` : ` · used ${v.used} time${v.used === 1 ? '' : 's'}`}</span></span>
              <span style={{ fontSize: 12.5, color: '#4D5A52' }}>{u.length ? `${naira(u.reduce((a, o) => a + o.discount, 0))} given on ${u.length} order${u.length === 1 ? '' : 's'}` : ''}</span>
              {ended ? <Pill>Ended</Pill> : full ? <Pill>Used up</Pill> : null}
              <Switch on={v.is_on} label={`${v.code} on`} onChange={x => toggle(v, x)} />
            </div>
          );
        })}
        {!d.vouchers.length && <Empty title="No discount codes yet." text="Make one for a first order, a student deal or a TikTok follower offer." />}
      </section>
      {editing && <Editor c={c} v={editing === 'new' ? null : editing} onClose={() => go('discounts')} />}
    </div>
  );
}
function Editor({ c, v, onClose }: { c: Ctx; v: Voucher | null; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ code: v?.code || '', kind: v?.kind || 'amt', value: String(v?.value ?? ''), cap: String(v?.cap ?? ''), min: String(v?.min_order ?? ''), ends: v?.ends_at || '', max: String(v?.max_uses ?? ''), once: v?.once_each ?? true, on: v?.is_on ?? true });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [del, setDel] = useState(false);
  const set = (k: keyof typeof f, x: string | boolean) => setF(y => ({ ...y, [k]: x }));
  const num = (s: string) => (s.trim() ? Number(s.replace(/\D/g, '')) : null);
  const save = async () => { setBusy(true); setErr(''); try { await call('/api/admin/vouchers', { code: f.code, kind: f.kind, value: num(f.value) || 0, cap: num(f.cap), min_order: num(f.min) || 0, ends_at: f.ends || null, max_uses: num(f.max), once_each: f.once, is_on: f.on, isNew: !v }); await c.reload(); toast('ok', v ? 'Code saved.' : `${f.code.toUpperCase()} created.`); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const remove = async () => { try { await call('/api/admin/vouchers?code=' + v!.code, undefined, 'DELETE'); await c.reload(); toast('ok', 'Code deleted.'); onClose(); } catch (e) { setErr((e as Error).message); setDel(false); } };
  return (
    <Drawer title={v ? v.code : 'Create a discount code'} onClose={onClose} foot={<>{v && <Btn kind="text" danger onClick={() => setDel(true)} style={{ marginRight: 'auto' }}>Delete</Btn>}<Btn kind="out" onClick={onClose}>Cancel</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save code'}</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <label style={{ ...lab, gridColumn: '1 / -1' }}>Code customers type<input value={f.code} disabled={!!v} onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="STUDENT10" style={{ ...input, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.08em' }} /></label>
        <label style={lab}>Type<select value={f.kind} onChange={e => set('kind', e.target.value)} style={input}><option value="amt">Naira off</option><option value="pct">Percent off</option></select></label>
        <label style={lab}>{f.kind === 'pct' ? 'Percent off' : 'Naira off'}<input value={f.value} onChange={e => set('value', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={f.kind === 'pct' ? '10' : '2000'} style={input} /></label>
        {f.kind === 'pct' && <label style={lab}>Most it can take off (optional)<input value={f.cap} onChange={e => set('cap', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="₦" style={input} /></label>}
        <label style={lab}>Smallest order it works on<input value={f.min} onChange={e => set('min', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="₦0" style={input} /></label>
        <label style={lab}>Ends on (optional)<input type="date" value={f.ends} onChange={e => set('ends', e.target.value)} style={input} /></label>
        <label style={lab}>Total uses allowed (optional)<input value={f.max} onChange={e => set('max', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="No limit" style={input} /></label>
        <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch on={f.once} label="Once per customer" onChange={x => set('once', x)} />Once per customer</label>
        <label style={{ ...lab, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch on={f.on} label="Switched on" onChange={x => set('on', x)} />Switched on</label>
      </div>
      {err && <p role="alert" style={{ margin: '14px 0 0', padding: '10px 12px', borderRadius: 8, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5 }}>{err}</p>}
      {del && <Confirm title={`Delete ${v?.code}?`} text="Customers won’t be able to use it any more. Orders that already used it keep their discount." yes="Delete" danger onNo={() => setDel(false)} onYes={remove} />}
    </Drawer>
  );
}
