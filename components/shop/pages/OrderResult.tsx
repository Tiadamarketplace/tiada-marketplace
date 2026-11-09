'use client';
import Link from '@/components/shop/Link';
import { useEffect, useRef, useState } from 'react';
import { useShop } from '../ShopProvider';
import { naira, api, waLink } from '@/lib/shop-client';
import { btnSolid, btnOut } from '../ui';

type Order = { id: string; name: string; status: string; total: number; subtotal: number; delivery_fee: number; discount: number; voucher: string | null; address: string; area_label: string | null; speed_label: string | null; zone_id: string | null; paid_at: string | null; items: { name: string; size: string; qty: number; price: number }[] };
type St = 'checking' | 'paid' | 'waiting' | 'failed';

export default function OrderResult({ id, payRef, cancelled }: { id: string; payRef: string; cancelled: boolean }) {
  const { clear, data, user } = useShop();
  const [st, setSt] = useState<St>('checking');
  const [o, setO] = useState<Order | null>(null);
  const [msg, setMsg] = useState('');
  const tries = useRef(0); const cleared = useRef(false);

  useEffect(() => {
    if (!payRef) { setSt('failed'); setMsg('This link is missing its payment reference. Check your email for your order, or message us.'); return; }
    let on = true; let t: ReturnType<typeof setTimeout>;
    const land = (status: string, order: Order | null) => {
      if (status === 'expired' || status === 'cancelled') { setSt('failed'); setMsg('This payment didn’t complete, so the order was not placed. Nothing was taken.'); return true; }
      if (status !== 'pending' && order) { setO(order); setSt('paid'); if (!cleared.current) { cleared.current = true; clear(); } return true; }
      return false;
    };
    const tick = async () => {
      tries.current++;
      try {
        const r = await api<{ status: string; order: Order | null; message?: string }>(`/api/orders/${encodeURIComponent(id)}/check`, { json: { ref: payRef } });
        if (!on) return;
        if (land(r.status, r.order)) return;
        if (cancelled && tries.current >= 2) { setSt('failed'); setMsg('You closed the payment before it finished. Nothing was taken, and your cart is still saved.'); return; }
        if (tries.current >= 6) setSt('waiting');
      } catch (e) {
        if (!on) return;
        if ((e as { status?: number }).status === 404) { setSt('failed'); setMsg('We couldn’t find this order. If money left your account, message us with your bank receipt and we’ll sort it out.'); return; }
      }
      t = setTimeout(tick, tries.current < 12 ? 4000 : 10000);
    };
    tick();
    return () => { on = false; clearTimeout(t); };
  }, [id, payRef, cancelled]); // eslint-disable-line react-hooks/exhaustive-deps

  const reg = data.zones.find(z => z.id === (o?.zone_id === 'st:Oyo' ? 'st:Oyo' : 'st:Lagos'));
  const day = o?.speed_label?.startsWith('Priority') ? 'today or next morning where we can' : `usually ${reg?.days || 'in 1–3 days'}`;
  const wa = waLink(data.business.whatsapp, `Hi Tiada, about my order ${id}.`);
  const wrap = (c: React.ReactNode) => <div className="fade" style={{ maxWidth: 620, margin: '48px auto 0', padding: '0 clamp(16px, 3vw, 28px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>{c}</div>;
  const spinner = <span style={{ width: 54, height: 54, borderRadius: '50%', border: '4px solid #E6E0D2', borderTopColor: '#0B3A23', animation: 'spin .9s linear infinite' }} />;

  if (st === 'checking') return wrap(<div role="status" style={{ display: 'contents' }}>{spinner}<h1 style={{ margin: 0, fontWeight: 500, fontSize: 28 }}>Confirming your payment…</h1><p style={{ margin: 0, fontSize: 15, color: '#66736B', lineHeight: 1.6 }}>We’re checking with Paystack that your payment arrived. This takes a few seconds. Please don’t close this page.</p></div>);

  if (st === 'waiting') return wrap(<div role="status" style={{ display: 'contents' }}>
    {spinner}
    <h1 style={{ margin: 0, fontWeight: 500, fontSize: 28 }}>Waiting for your bank</h1>
    <p style={{ margin: 0, fontSize: 15, color: '#4D5A52', lineHeight: 1.7 }}>Transfers and USSD payments can take a few minutes to reach us. Keep this page open and it will update on its own. We’ll also email you as soon as it lands.</p>
    <div style={{ padding: '14px 18px', borderRadius: 6, background: '#FBF9F4', fontSize: 13.5, color: '#4D5A52' }}>Order <strong style={{ color: '#0B3A23', letterSpacing: '0.04em' }}>{id}</strong></div>
    <a href={wa} target="_blank" rel="noopener" className="btn-out" style={btnOut}>Money left my account? Tell us on WhatsApp</a>
  </div>);

  if (st === 'failed') return wrap(<>
    <span style={{ width: 64, height: 64, borderRadius: '50%', background: '#FBEFEB', color: '#7A2A1B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 600 }}>!</span>
    <h1 style={{ margin: 0, fontWeight: 500, fontSize: 28 }}>Payment not completed</h1>
    <p role="alert" style={{ margin: 0, fontSize: 15, color: '#4D5A52', lineHeight: 1.7 }}>{msg}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
      <Link href="/checkout" className="ub btn-solid press" style={btnSolid}>Back to checkout</Link>
      <a href={wa} target="_blank" rel="noopener" className="btn-out" style={btnOut}>Get help on WhatsApp</a>
    </div>
  </>);

  return wrap(<>
    <span className="pop" style={{ width: 76, height: 76, borderRadius: '50%', background: '#0B3A23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D49B41" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
    <h1 style={{ margin: 0, fontWeight: 500, fontSize: 'clamp(28px, 5vw, 34px)', letterSpacing: '-0.015em' }}>Thank you, {(o?.name || '').split(' ')[0]}</h1>
    <p className="serif" style={{ margin: 0, fontSize: 19, color: '#8A5F1C' }}>Your payment is in and your order is confirmed.</p>
    <div style={{ padding: '16px 28px', border: '1px dashed #D49B41', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#66736B' }}>Tracking code</span><span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '0.08em', color: '#0B3A23' }}>{id}</span></div>
    <div style={{ width: '100%', textAlign: 'left', border: '1px solid #ECE8DF', borderRadius: 8, padding: '6px 20px 8px', fontSize: 14 }}>
      <div style={{ padding: '12px 0 8px', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#66736B', fontWeight: 600 }}>Order details</div>
      {o?.items.map((it, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', borderTop: '1px solid #ECE8DF' }}><span>{it.name}{it.size !== 'Package' ? ` · ${it.size}` : ''} × {it.qty}</span><span>{naira(it.price * it.qty)}</span></div>)}
      {[['Delivery', naira(o?.delivery_fee || 0)], ...(o?.discount ? [[`Discount (${o.voucher})`, '−' + naira(o.discount)]] : []), ['Paid', naira(o?.total || 0)], ['Delivering to', `${o?.address}, ${o?.area_label || ''}`], ['Arrives', day]].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '4px 16px', padding: '11px 0', borderTop: '1px solid #ECE8DF' }}><span style={{ color: '#66736B' }}>{k}</span><span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span></div>
      ))}
    </div>
    <ol style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, textAlign: 'left' }}>
      {[['We pack it', 'Measured and sealed at our hub.'], ['We tell you', 'An email when the rider sets off.'], ['It arrives', `At your door ${day}.`]].map(([t, d], i) => (
        <li key={t} style={{ padding: 16, borderRadius: 8, background: '#FBF9F4', display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#D49B41' }}>{i + 1}</span><strong style={{ fontSize: 14, fontWeight: 600 }}>{t}</strong><span style={{ fontSize: 13, lineHeight: 1.55, color: '#66736B' }}>{d}</span></li>
      ))}
    </ol>
    <p style={{ margin: 0, fontSize: 13.5, color: '#66736B' }}>We’ve emailed your receipt. Keep your tracking code to check progress any time.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
      <Link href={user ? '/account' : '/track'} className="ub btn-solid press" style={btnSolid}>{user ? 'See my orders' : 'Track this order'}</Link>
      <Link href="/" className="btn-out" style={btnOut}>Keep shopping</Link>
    </div>
  </>);
}
