'use client';
import Link from '@/components/shop/Link';
import { useState } from 'react';
import { useShop } from '../ShopProvider';
import { Stepper, Dialog } from '../Overlays';
import { naira } from '@/lib/shop-client';
import { EmptyCart, H1, Page, Thumb, btnSolid } from '../ui';

export default function CartPage() {
  const { priced, subtotal, kg, setQty, remove, clear, data, notify } = useShop();
  const [ask, setAsk] = useState(false);
  const short = data.fees.min - subtotal;
  return (
    <Page>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <H1>Your cart</H1>
        <Link href="/aisle/all" className="lnk" style={{ fontSize: 14, color: '#0B3A23' }}>Continue shopping</Link>
      </div>
      {!priced.length ? <EmptyCart /> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, marginTop: 28, alignItems: 'flex-start' }}>
          <div style={{ flex: '999 1 560px', minWidth: 0 }}>
            <div className="hide-xs" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px 110px', gap: 16, paddingBottom: 12, borderBottom: '1px solid #ECE8DF', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#66736B' }}><span>Product</span><span>Quantity</span><span style={{ textAlign: 'right' }}>Total</span></div>
            {priced.map(it => (
              <div key={it.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px 16px', padding: '22px 0', borderBottom: '1px solid #ECE8DF' }}>
                <Link href={'/p/' + it.pid} aria-label={it.product.name}><Thumb pid={it.pid} size={92} /></Link>
                <div style={{ flex: '1 1 180px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Link href={'/p/' + it.pid} style={{ fontSize: 15, fontWeight: 500, color: '#1F2A23', textDecoration: 'none' }}>{it.product.name}</Link>
                  <span style={{ fontSize: 13, color: '#66736B' }}>{it.size} · {naira(it.price)}{it.was ? <s style={{ marginLeft: 6 }}>{naira(it.was)}</s> : null}</span>
                  {it.swaps?.length ? <span style={{ fontSize: 12.5, color: '#8A5F1C' }}>Swaps: {it.swaps.map(w => `${w.from} → ${w.to}`).join(', ')}</span> : null}
                  {it.sizeInfo.left != null && <span style={{ fontSize: 12.5, fontWeight: 600, color: '#B8402B' }}>Only {it.sizeInfo.left} left</span>}
                  <button type="button" className="ub quiet" onClick={() => remove(it.key)} style={{ alignSelf: 'flex-start', minHeight: 32, fontSize: 13, color: '#66736B', textDecoration: 'underline', textUnderlineOffset: 3 }}>Remove</button>
                </div>
                <div style={{ width: 140 }}><Stepper h={42} qty={it.qty} dec={() => setQty(it.key, it.qty - 1)} inc={() => setQty(it.key, it.qty + 1)} /></div>
                <span style={{ width: 110, textAlign: 'right', fontSize: 15, fontWeight: 600 }}>{naira(it.line)}</span>
              </div>
            ))}
            <button type="button" className="ub quiet" onClick={() => setAsk(true)} style={{ marginTop: 14, minHeight: 36, fontSize: 13, color: '#66736B', textDecoration: 'underline', textUnderlineOffset: 3 }}>Empty cart</button>
          </div>
          <aside aria-label="Summary" style={{ flex: '1 1 300px', background: '#FBF9F4', borderRadius: 8, padding: 26, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 150 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span>Subtotal</span><strong style={{ fontWeight: 600 }}>{naira(subtotal)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#66736B' }}><span>Total weight</span><span>{kg} kg</span></div>
            {short > 0
              ? <p style={{ margin: 0, padding: '10px 12px', borderRadius: 6, background: '#F6E9CF', fontSize: 13, lineHeight: 1.55, color: '#4A3510' }}>Add <strong>{naira(short)}</strong> more to reach our {naira(data.fees.min)} delivery minimum.</p>
              : <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#66736B' }}>Delivery is added at checkout once you choose your area.</p>}
            <Link href="/checkout" className="ub btn-solid press" style={{ ...btnSolid, opacity: short > 0 ? 0.5 : 1, pointerEvents: short > 0 ? 'none' : 'auto' }} aria-disabled={short > 0}>Check out</Link>
          </aside>
        </div>
      )}
      {ask && <Dialog title="Empty your cart?" text="Everything in it will be removed." yesLabel="Empty cart" danger onNo={() => setAsk(false)} onYes={() => { setAsk(false); clear(); notify('info', 'Your cart is empty.'); }} />}
    </Page>
  );
}
