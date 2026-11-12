'use client';
import { useEffect, useMemo, useState } from 'react';
import { mapLink, runOf } from './runs';
import EditOrder from './EditOrder';
import type { Ctx } from './Desk';
import type { Order } from './types';
import { naira, card, Btn, Tabs, Drawer, Confirm, Empty, StatusPill, call, useToast, input, lab, dt, ago, fmtPhone } from './ui';

type Tab = 'new' | 'packed' | 'route' | 'issue' | 'done' | 'all';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const REASONS = ['Item out of stock', 'Delivery delayed', 'Couldn’t reach the customer', 'Wrong address', 'Damaged in transit', 'Customer asked to cancel'];

export default function Orders({ c }: { c: Ctx }) {
  const { d, reload, hash, go } = c;
  const toast = useToast();
  const h = hash.startsWith('orders=') ? hash.slice(7) : '';
  const [tab, setTab] = useState<Tab>(h === 'issue' || h === 'route' || h === 'done' || h === 'packed' ? h : 'new');
  const [day, setDay] = useState<string>(h.startsWith('run:') ? h.slice(4) : '');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const openId = hash.startsWith('order=') ? hash.slice(6).split('&')[0] : '';
  const openDo = hash.includes('&do=') ? hash.split('&do=')[1] : '';
  const open = d.orders.find(o => o.id === openId) || null;
  useEffect(() => { if (h.startsWith('run:')) { setDay(h.slice(4)); setTab('all'); setSheet(true); } }, [h]);

  const zone = (o: Order) => d.zones.find(z => z.id === o.zone_id);
  const dayOf = (o: Order) => runOf(o, zone(o));
  const count = (t: Tab) => (t === 'all' ? d.orders.length : d.orders.filter(o => o.status === t).length);
  const list = useMemo(() => d.orders.filter(o => (tab === 'all' ? true : o.status === tab) && (!day || dayOf(o) === day) && (!q.trim() || `${o.id} ${o.name} ${o.phone} ${o.area_label}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => (tab === 'new' ? Date.parse(a.paid_at || a.created_at) - Date.parse(b.paid_at || b.created_at) : Date.parse(b.created_at) - Date.parse(a.created_at))), [d.orders, tab, day, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const dayChips = Array.from(new Set(d.orders.filter(o => ['new', 'packed', 'route'].includes(o.status)).map(dayOf))).sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));

  const bulkPack = async () => {
    setBusy(true); let n = 0; const errs: string[] = [];
    for (const id of sel) { try { await call(`/api/admin/orders/${id}`, { action: 'packed' }); n++; } catch (e) { errs.push(`${id}: ${(e as Error).message}`); } }
    setBusy(false); setSel(new Set()); await reload();
    if (errs.length) toast('err', `${errs.length} couldn’t be marked packed.`, errs[0]); else toast('ok', `${n} order${n === 1 ? '' : 's'} marked packed.`, 'Customers got a “packed” email.');
  };
  const toggle = (id: string) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <Tabs value={tab} onChange={t => { setTab(t); setSel(new Set()); }} tabs={[['new', 'To pack', count('new')], ['packed', 'Packed', count('packed')], ['route', 'On the way', count('route')], ['issue', 'Problems', count('issue')], ['done', 'Delivered'], ['all', 'All']]} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Find an order" aria-label="Find an order" style={{ ...input, width: 200, height: 40 }} />
          <Btn kind="out" onClick={() => setSheet(true)}>Run sheet</Btn>
        </div>
      </div>
      {dayChips.length > 1 && (
        <div className="noscroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {['', ...dayChips].map(x => <button key={x || 'all'} type="button" className="ub chip" aria-pressed={day === x} onClick={() => setDay(x)} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid ${day === x ? '#0B3A23' : '#DCD6CA'}`, background: day === x ? '#0B3A23' : '#FFFFFF', color: day === x ? '#FFFFFF' : '#1F2A23', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{x || 'Every day'}</button>)}
        </div>
      )}
      {sel.size > 0 && (
        <div className="fade" style={{ position: 'sticky', top: 76, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: '#0B3A23', color: '#FFFFFF' }}>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{sel.size} selected</span>
          <Btn kind="soft" small onClick={() => setSel(new Set())}>Clear</Btn>
          <Btn small onClick={bulkPack} disabled={busy} style={{ background: '#D49B41', color: '#0B3A23' }}>{busy ? 'Marking…' : 'Mark packed'}</Btn>
        </div>
      )}
      <section style={{ ...card, overflow: 'hidden' }}>
        <div className="grid-o ohead" style={{ padding: '12px 18px', borderBottom: '1px solid #ECE8DF', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B958E' }}>
          <span>{tab === 'new' && list.length ? <input type="checkbox" aria-label="Select all" checked={sel.size === list.length} onChange={e => setSel(e.target.checked ? new Set(list.map(o => o.id)) : new Set())} /> : null}</span><span>Order</span><span>Customer</span><span>Area · day</span><span>Weight</span><span>Status</span><span style={{ textAlign: 'right' }}>Total</span>
        </div>
        {list.map(o => (
          <div key={o.id} className="grid-o tdrow" onClick={() => go('orders', 'order=' + o.id)} style={{ padding: '14px 18px', borderBottom: '1px solid #F0ECE3', cursor: 'pointer' }}>
            <span className="c-ck" onClick={e => e.stopPropagation()}>{o.status === 'new' && <input type="checkbox" aria-label={`Select ${o.id}`} checked={sel.has(o.id)} onChange={() => toggle(o.id)} />}</span>
            <span className="c-code" style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{o.id}</span>
            <span className="c-who" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{o.name}</span><span style={{ fontSize: 12, color: '#66736B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</span></span>
            <span className="c-area" style={{ color: '#4D5A52', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.area_label} · {dayOf(o)} <span style={{ color: '#8B958E' }}>· {ago(o.paid_at || o.created_at)}</span></span>
            <span className="c-kg" style={{ color: '#66736B' }}>{o.kg} kg</span>
            <span className="c-st"><StatusPill s={o.status} /></span>
            <span className="c-tot" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(o.total)}</span>
          </div>
        ))}
        {!list.length && <Empty title={tab === 'new' ? 'Nothing to pack.' : 'No orders here.'} text={tab === 'new' ? 'New paid orders will chime and show up here.' : 'Try another tab.'} />}
      </section>
      {d.testPending.length > 0 && (
        <section style={{ ...card, padding: '16px 18px' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Test orders waiting for payment</h2>
          <p style={{ margin: '4px 0 10px', fontSize: 12.5, color: '#66736B' }}>Only while Paystack is in test mode. Mark one paid to try the emails and the desk.</p>
          {d.testPending.map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #F0ECE3' }}><span style={{ flex: 1 }}>{t.id} · {t.name} · {naira(t.total)}</span><Btn small kind="out" onClick={async () => { try { await call('/api/admin/testpay', { id: t.id }); await reload(); toast('ok', `${t.id} marked paid.`); } catch (e) { toast('err', 'Couldn’t mark it paid.', (e as Error).message); } }}>Mark paid</Btn></div>)}
        </section>
      )}
      {open && <OrderDrawer c={c} o={open} start={openDo} onClose={() => go('orders', tab === 'new' ? '' : 'orders=' + tab)} />}
      {sheet && <RunSheet c={c} day={day} dayOf={dayOf} onClose={() => setSheet(false)} />}
    </div>
  );
}

function OrderDrawer({ c, o, start, onClose }: { c: Ctx; o: Order; start: string; onClose: () => void }) {
  const { d, reload } = c;
  const toast = useToast();
  const [mode, setMode] = useState<'' | 'route' | 'done' | 'issue' | 'refund' | 'cancel' | 'note' | 'edit'>(start === 'issue' ? 'issue' : '');
  const [f, setF] = useState({ partner: 'Tiada rider', tracking: '', driver: '', phone: '', cost: '', how: 'Handed to the customer', reason: '', note: '', eta: '', amount: '', full: true });
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<null | { title: string; text: string; yes: string; body: Record<string, unknown> }>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF(x => ({ ...x, [k]: v }));
  const z = d.zones.find(x => x.id === o.zone_id);
  const refunded = (o.refunds || []).reduce((a, r) => a + r.amount, 0);
  const paidAmt = o.paid ?? o.total;
  const emails = d.messages.filter(m => m.order_id === o.id);
  const act = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      const r = await call<{ email: { ok: boolean; error?: string } | null }>(`/api/admin/orders/${o.id}`, body);
      await reload(); setMode(''); setAsk(null);
      toast('ok', msg, r.email ? (r.email.ok ? `${o.name.split(' ')[0]} got an email.` : 'The email didn’t send: ' + (r.email.error || '')) : '');
    } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } finally { setBusy(false); }
  };
  const isCourier = !!z?.state;
  const wa = `https://wa.me/234${o.phone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`Hello ${o.name.split(' ')[0]}, this is Tiada Marketplace about your order ${o.id}.`)}`;
  const box: React.CSSProperties = { marginTop: 14, padding: 16, borderRadius: 12, background: '#FBF9F4', border: '1px solid #ECE8DF', display: 'flex', flexDirection: 'column', gap: 12 };

  const foot = (
    <>
      {o.status === 'new' && <><Btn kind="out" onClick={() => setMode('issue')}>Can’t fill it</Btn><Btn disabled={busy} onClick={() => act({ action: 'packed' }, `${o.id} marked packed.`)}>Mark packed</Btn></>}
      {o.status === 'packed' && <><Btn kind="out" onClick={() => setMode('issue')}>Report a problem</Btn><Btn onClick={() => setMode('route')}>Send it out</Btn></>}
      {o.status === 'route' && <><Btn kind="out" onClick={() => setMode('issue')}>Report a problem</Btn><Btn onClick={() => setMode('done')}>Mark delivered</Btn></>}
      {o.status === 'issue' && <><Btn kind="out" onClick={() => setMode('refund')}>Refund</Btn><Btn onClick={() => act({ action: 'resume' }, 'Marked as sorted.')}>Problem sorted</Btn></>}
      {o.status === 'done' && <Btn kind="out" onClick={() => setMode('refund')}>Refund</Btn>}
    </>
  );
  return (
    <Drawer title={`${o.id} · ${naira(o.total)}`} sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusPill s={o.status} /> Paid {dt(o.paid_at || o.created_at)}</span>} onClose={onClose} foot={['refunded', 'cancelled'].includes(o.status) ? undefined : foot}>
      {o.status === 'issue' && o.issue && <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FBEFEB', color: '#7A2A1B', fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}><strong>{o.issue.reason}</strong> {o.issue.note}{o.issue.eta ? ` · New date: ${o.issue.eta}` : ''}</div>}

      {!['done', 'refunded', 'cancelled'].includes(o.status) && mode !== 'edit' && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn kind="out" small onClick={() => setMode('edit')}>Edit order</Btn></div>}
      {mode === 'edit' && <EditOrder c={c} o={o} onDone={() => setMode('')} />}
      {mode === 'route' && (
        <div style={box} className="fade">
          <strong>Send it out</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <label style={lab}>{isCourier ? 'Courier company' : 'Rider or company'}<input value={f.partner} onChange={e => set('partner', e.target.value)} style={input} list="partners" /></label>
            <datalist id="partners"><option value="Tiada rider" /><option value="GIG Logistics" /><option value="Red Star Express" /><option value="DHL Nigeria" /><option value="Gokada" /></datalist>
            <label style={lab}>{isCourier ? 'Tracking number' : 'Booking or run number'}<input value={f.tracking} onChange={e => set('tracking', e.target.value)} placeholder={isCourier ? 'From the courier receipt' : `RUN-${new Date().toISOString().slice(5, 10)}`} style={input} /></label>
            {!isCourier && <><label style={lab}>Rider’s name<input value={f.driver} onChange={e => set('driver', e.target.value)} style={input} /></label><label style={lab}>Rider’s phone<input value={f.phone} onChange={e => set('phone', e.target.value)} inputMode="tel" style={input} /></label></>}
            <label style={lab}>What you paid for delivery (optional)<input value={f.cost} onChange={e => set('cost', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="₦" style={input} /></label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Btn kind="text" onClick={() => setMode('')}>Cancel</Btn><Btn disabled={busy} onClick={() => act({ action: 'route', partner: f.partner, tracking: f.tracking || `RUN-${new Date().toISOString().slice(0, 10)}`, driver: f.driver || undefined, phone: f.phone || undefined, cost: f.cost ? Number(f.cost) : undefined }, `${o.id} is on the way.`)}>Send and email the customer</Btn></div>
        </div>
      )}
      {mode === 'done' && (
        <div style={box} className="fade">
          <strong>Mark delivered</strong>
          <label style={lab}>How was it delivered?<select value={f.how} onChange={e => set('how', e.target.value)} style={input}><option>Handed to the customer</option><option>Left with family or security</option><option>Courier confirmed delivery</option><option>Customer picked it up</option></select></label>
          <label style={lab}>Note (optional)<input value={f.note} onChange={e => set('note', e.target.value)} style={input} /></label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Btn kind="text" onClick={() => setMode('')}>Cancel</Btn><Btn disabled={busy} onClick={() => act({ action: 'done', how: f.how, note: f.note || undefined }, `${o.id} delivered.`)}>Mark delivered</Btn></div>
        </div>
      )}
      {mode === 'issue' && (
        <div style={box} className="fade">
          <strong>{o.status === 'new' ? 'Can’t fill this order?' : 'Report a problem'}</strong>
          <p style={{ margin: 0, fontSize: 13, color: '#4D5A52', lineHeight: 1.55 }}>The customer gets an email with what happened. You can refund part of the order, or cancel and refund it all, after.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{REASONS.map(r => <button key={r} type="button" className="ub chip" onClick={() => set('reason', r)} style={{ height: 32, padding: '0 12px', borderRadius: 999, border: `1px solid ${f.reason === r ? '#0B3A23' : '#DCD6CA'}`, background: f.reason === r ? '#0B3A23' : '#FFFFFF', color: f.reason === r ? '#FFFFFF' : '#1F2A23', fontSize: 12.5 }}>{r}</button>)}</div>
          <label style={lab}>What happened<input value={f.reason} onChange={e => set('reason', e.target.value)} style={input} /></label>
          <label style={lab}>Tell the customer more (optional)<textarea rows={2} value={f.note} onChange={e => set('note', e.target.value)} /></label>
          <label style={lab}>New delivery date (optional)<input value={f.eta} onChange={e => set('eta', e.target.value)} placeholder="e.g. Thursday 12 November" style={input} /></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <Btn kind="text" onClick={() => setMode('')}>Cancel</Btn>
            <Btn kind="out" danger onClick={() => setAsk({ title: `Cancel ${o.id}?`, text: `${o.name} gets the full ${naira(paidAmt - refunded)} back through Paystack, and an email saying why. This can’t be undone.`, yes: 'Cancel and refund', body: { action: 'cancel', reason: f.reason || 'We couldn’t fill your order', note: f.note || undefined } })}>Cancel and refund all</Btn>
            <Btn disabled={busy || f.reason.trim().length < 2} onClick={() => act({ action: 'issue', reason: f.reason, note: f.note || undefined, eta: f.eta || undefined }, 'Problem saved and customer told.')}>Save and tell the customer</Btn>
          </div>
        </div>
      )}
      {mode === 'refund' && (
        <div style={box} className="fade">
          <strong>Refund</strong>
          <p style={{ margin: 0, fontSize: 13, color: '#4D5A52' }}>Paid {naira(paidAmt)}{refunded ? `, already refunded ${naira(refunded)}` : ''}. Money goes back through Paystack to the card or account they paid with.</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}><input type="radio" checked={f.full} onChange={() => set('full', true)} />Everything left ({naira(paidAmt - refunded)})</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}><input type="radio" checked={!f.full} onChange={() => set('full', false)} />Part of it<input value={f.amount} onChange={e => { set('amount', e.target.value.replace(/\D/g, '')); set('full', false); }} inputMode="numeric" placeholder="₦" style={{ ...input, width: 120, height: 36 }} /></label>
          <label style={lab}>Reason<input value={f.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. One Coco Pops pack was missing" style={input} /></label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Btn kind="text" onClick={() => setMode('')}>Cancel</Btn><Btn disabled={f.reason.trim().length < 2 || (!f.full && !Number(f.amount))} onClick={() => setAsk({ title: `Refund ${f.full ? naira(paidAmt - refunded) : naira(Number(f.amount))}?`, text: 'This sends money back through Paystack straight away and emails the customer. It can’t be undone.', yes: 'Refund now', body: { action: 'refund', full: f.full, amount: f.full ? undefined : Number(f.amount), reason: f.reason } })}>Refund</Btn></div>
        </div>
      )}
      {mode === 'note' && (
        <div style={box} className="fade">
          <strong>Email {o.name.split(' ')[0]}</strong>
          <textarea rows={4} value={f.note} onChange={e => set('note', e.target.value)} placeholder="Write your message. It goes out in the Tiada email style with the order code." />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Btn kind="text" onClick={() => setMode('')}>Cancel</Btn><Btn disabled={busy || f.note.trim().length < 2} onClick={() => act({ action: 'note', note: f.note }, 'Email sent.')}>Send email</Btn></div>
        </div>
      )}

      <h3 style={{ margin: '20px 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B958E' }}>Pack list · {o.kg} kg</h3>
      {o.items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0ECE3' }}>
          <span style={{ width: 42, height: 42, borderRadius: 8, background: '#F6F1E7', overflow: 'hidden', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#8A5F1C' }}>{it.img ? <img src={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : it.qty}</span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ fontWeight: 600 }}>{it.qty} × {it.name}</span>{it.size !== 'Package' && <span style={{ color: '#66736B' }}> · {it.size}</span>}{it.swaps?.length ? <span style={{ display: 'block', fontSize: 12.5, color: '#8A5F1C' }}>Swap: {it.swaps.map(w => `${w.from} → ${w.to}`).join(', ')}</span> : null}</span>
          <span style={{ fontWeight: 600 }}>{naira(it.price * it.qty)}</span>
        </div>
      ))}
      <div style={{ fontSize: 13.5, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#66736B' }}>Delivery · {o.speed_label}</span><span>{naira(o.delivery_fee)}</span></span>
        {o.discount > 0 && <span style={{ display: 'flex', justifyContent: 'space-between', color: '#0B3A23' }}><span>Discount {o.voucher}</span><span>−{naira(o.discount)}</span></span>}
        {o.paid != null && o.paid !== o.total && <span style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Order total now</span><span>{naira(o.total)}</span></span>}
        <span style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Paid</span><span>{naira(o.paid ?? o.total)}</span></span>
        {refunded > 0 && <span style={{ display: 'flex', justifyContent: 'space-between', color: '#9E3522' }}><span>Refunded</span><span>−{naira(refunded)}</span></span>}
      </div>

      <h3 style={{ margin: '16px 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B958E' }}>Customer</h3>
      <div style={{ fontSize: 14, lineHeight: 1.65 }}>
        <div style={{ fontWeight: 600 }}>{o.name}</div>
        <div><a href={'tel:' + o.phone}>{fmtPhone(o.phone)}</a> · <a href={wa} target="_blank" rel="noopener">WhatsApp</a> · <a href={'mailto:' + o.email}>{o.email}</a></div>
        <div>{o.address}{o.landmark ? <span style={{ color: '#66736B' }}> (near {o.landmark})</span> : null}</div>
        <div style={{ color: '#66736B' }}>{o.area_label} · {runOf(o, z)} · {o.speed_label}{o.spot?.km != null ? ` · about ${Math.round(o.spot.km)} km` : ''}</div>
        {o.spot && <a href={mapLink(o.spot)} target="_blank" rel="noopener" style={{ color: '#0B3A23', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>Open in Google Maps</a>}
        {o.note && <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: '#FBF2DE', fontSize: 13 }}><strong>Their note:</strong> {o.note}</div>}
        {o.rider?.partner && <div style={{ marginTop: 6, color: '#4D5A52' }}>Sent with {o.rider.partner}{o.rider.tracking ? ` · ${o.rider.tracking}` : ''}{o.rider.driver ? ` · ${o.rider.driver}` : ''}</div>}
        {o.confirm?.how && <div style={{ color: '#4D5A52' }}>Delivered: {o.confirm.how}{o.confirm.by ? ` (${o.confirm.by})` : ''}</div>}
      </div>
      {mode !== 'note' && <Btn kind="text" onClick={() => setMode('note')} style={{ marginTop: 6 }}>Email the customer</Btn>}

      <h3 style={{ margin: '18px 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B958E' }}>Emails sent</h3>
      {emails.length ? emails.map(m => <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', fontSize: 13, borderBottom: '1px solid #F5F2EB' }}><span>{({ placed: 'Order confirmed', packed: 'Packed', route: 'On the way', done: 'Delivered', issue: 'Problem update', refund: 'Refund', cancel: 'Cancelled', note: 'Your message' } as Record<string, string>)[m.kind] || m.kind}</span><span style={{ color: m.email_ok ? '#66736B' : '#9E3522' }}>{m.email_ok ? ago(m.created_at) : 'Didn’t send'}</span></div>) : <p style={{ margin: 0, fontSize: 13, color: '#66736B' }}>None yet.</p>}
      {ask && <Confirm title={ask.title} text={ask.text} yes={ask.yes} danger onNo={() => setAsk(null)} onYes={() => act(ask.body, ask.body.action === 'cancel' ? 'Order cancelled and refunded.' : 'Refund sent.')} />}
    </Drawer>
  );
}

function RunSheet({ c, day, dayOf, onClose }: { c: Ctx; day: string; dayOf: (o: Order) => string; onClose: () => void }) {
  const { d, reload } = c;
  const toast = useToast();
  const days = Array.from(new Set(d.orders.filter(o => ['new', 'packed', 'route'].includes(o.status)).map(dayOf)));
  const [pick, setPick] = useState(day && days.includes(day) ? day : days[0] || '');
  const [busy, setBusy] = useState(false);
  const list = d.orders.filter(o => ['new', 'packed', 'route'].includes(o.status) && dayOf(o) === pick);
  const text = `*Tiada ${pick} run* (${list.length} drops)\n\n` + list.map((o, i) => `${i + 1}. ${o.id} · ${o.name} · ${fmtPhone(o.phone)}\n${o.address}${o.landmark ? ' (near ' + o.landmark + ')' : ''}, ${o.area_label}${o.spot ? '\n' + mapLink(o.spot) : ''}\n${o.items.map(it => `${it.qty} × ${it.name}${it.size !== 'Package' ? ' ' + it.size : ''}`).join(', ')}`).join('\n\n');
  const copy = async () => { try { await navigator.clipboard.writeText(text); toast('ok', 'Copied.', 'Paste it into WhatsApp for the rider.'); } catch { toast('err', 'Couldn’t copy.', 'Select the text and copy it instead.'); } };
  const all = async (action: 'route' | 'done') => {
    setBusy(true); let n = 0;
    for (const o of list.filter(x => (action === 'route' ? x.status === 'packed' || x.status === 'new' : x.status === 'route'))) {
      try { await call(`/api/admin/orders/${o.id}`, action === 'route' ? { action: 'route', partner: 'Tiada rider', tracking: `RUN-${new Date().toISOString().slice(0, 10)}` } : { action: 'done', how: 'Handed to the customer' }); n++; } catch { /* keep going */ }
    }
    setBusy(false); await reload(); toast('ok', `${n} order${n === 1 ? '' : 's'} ${action === 'route' ? 'sent out' : 'marked delivered'}.`, 'Customers were emailed.');
  };
  return (
    <Drawer wide title="Run sheet" sub="Everything for one delivery run, ready for the rider." onClose={onClose} foot={<>
      <Btn kind="out" onClick={copy}>Copy for WhatsApp</Btn><Btn kind="out" onClick={() => window.print()}>Print</Btn>
      {list.some(o => o.status !== 'route') && <Btn disabled={busy} onClick={() => all('route')}>Send all out</Btn>}
      {list.some(o => o.status === 'route') && <Btn disabled={busy} onClick={() => all('done')}>Mark all delivered</Btn>}
    </>}>
      <div className="noscroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14 }}>
        {days.map(x => <button key={x} type="button" className="ub chip" onClick={() => setPick(x)} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid ${pick === x ? '#0B3A23' : '#DCD6CA'}`, background: pick === x ? '#0B3A23' : '#FFFFFF', color: pick === x ? '#FFFFFF' : '#1F2A23', fontSize: 12.5, fontWeight: 600 }}>{x}</button>)}
      </div>
      <div className="printable">
        {list.map((o, i) => (
          <div key={o.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #ECE8DF', breakInside: 'avoid' }}>
            <span className="serif" style={{ width: 28, fontSize: 22, color: '#D49B41' }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{o.id} · {o.name}</strong><StatusPill s={o.status} /></div>
              <div><a href={'tel:' + o.phone}>{fmtPhone(o.phone)}</a></div>
              <div>{o.address}{o.landmark ? ` (near ${o.landmark})` : ''}, {o.area_label}</div>
              <div style={{ color: '#4D5A52' }}>{o.items.map(it => `${it.qty} × ${it.name}${it.size !== 'Package' ? ' ' + it.size : ''}`).join(', ')}</div>
            </div>
          </div>
        ))}
        {!list.length && <Empty title="No drops for this run." />}
      </div>
    </Drawer>
  );
}
