'use client';
import { useMemo, useState } from 'react';
import type { Ctx } from './Desk';
import { naira, card, Empty, Pill, input, ago, fmtPhone } from './ui';

export default function Customers({ c }: { c: Ctx }) {
  const { d, go } = c;
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const by: Record<string, { name: string; email: string; phone: string | null; orders: number; spent: number; last: string | null; promo: boolean; joined: string | null; account: boolean }> = {};
    for (const cu of d.customers) by[cu.email.toLowerCase()] = { name: cu.name || '', email: cu.email, phone: cu.phone, orders: 0, spent: 0, last: null, promo: cu.promo_ok, joined: cu.created_at, account: true };
    for (const o of d.orders) {
      if (['cancelled'].includes(o.status)) continue;
      const k = o.email.toLowerCase(); const r = (by[k] ||= { name: o.name, email: o.email, phone: o.phone, orders: 0, spent: 0, last: null, promo: false, joined: null, account: false });
      r.orders++; r.spent += o.total - (o.refunds || []).reduce((a, x) => a + x.amount, 0); if (!r.last || o.created_at > r.last) r.last = o.created_at; if (!r.name) r.name = o.name; if (!r.phone) r.phone = o.phone;
    }
    const t = q.trim().toLowerCase();
    return Object.values(by).filter(r => !t || `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(t)).sort((a, b) => b.spent - a.spent);
  }, [d.customers, d.orders, q]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Find a customer" aria-label="Find a customer" style={{ ...input, maxWidth: 320, height: 40 }} />
      <section style={{ ...card, overflow: 'hidden' }}>
        {rows.map(r => (
          <div key={r.email} className="tdrow" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px', padding: '14px 18px', borderBottom: '1px solid #F0ECE3' }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#F2EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0B3A23', flex: 'none' }}>{(r.name || r.email)[0].toUpperCase()}</span>
            <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column' }}><strong>{r.name || '—'}</strong><span style={{ fontSize: 12.5, color: '#66736B' }}>{r.email}{r.phone ? ` · ${fmtPhone(r.phone)}` : ''}</span></span>
            <span style={{ display: 'flex', gap: 6 }}>{r.account ? <Pill bg="#E6EEE8" fg="#0B3A23">Account</Pill> : <Pill>Guest</Pill>}{r.promo && <Pill bg="#F6E9CF" fg="#6B4A12">Deals emails</Pill>}</span>
            <span style={{ width: 150, fontSize: 13, color: '#4D5A52' }}>{r.orders} order{r.orders === 1 ? '' : 's'}{r.last ? ` · last ${ago(r.last)}` : ''}</span>
            <button type="button" className="ub" onClick={() => r.orders && go('orders', 'orders=all')} style={{ width: 100, textAlign: 'right', fontWeight: 600 }}>{naira(r.spent)}</button>
          </div>
        ))}
        {!rows.length && <Empty title="No customers yet." />}
      </section>
      {d.me.role !== 'Owner' && <p style={{ margin: 0, fontSize: 12.5, color: '#66736B' }}>Phone numbers of account holders are partly hidden for staff. The owner sees them in full.</p>}
    </div>
  );
}
