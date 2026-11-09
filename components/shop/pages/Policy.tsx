'use client';
import Link from 'next/link';
import { useShop } from '../ShopProvider';
import { H1 } from '../ui';

type Sec = [string, string];
export default function Policy({ kind }: { kind: 'privacy' | 'terms' }) {
  const { data } = useShop();
  const b = data.business; const pol = data.policies;
  const contact = `${b.email} · WhatsApp ${b.phone}`;
  const privacy: Sec[] = [
    ['What we collect', 'Your name, phone number and email, so we can confirm your order and send updates. Your delivery address and landmark, so the rider can find you. Your orders and any reviews you write.'],
    ['What we never collect', 'Your card number, PIN, bank login or BVN. Payments happen inside Paystack’s secure window, and Paystack only tells us whether the payment went through.'],
    ['Who sees it', 'The rider or courier sees your name, phone and address for that delivery only. Paystack processes your payment. Our email provider sends your order emails. We never sell your data or share it with advertisers.'],
    ['How we protect it', 'The whole site runs over HTTPS. Sign-in uses one-time codes sent to your email, which expire after 10 minutes and lock after repeated wrong tries. Staff access to orders is limited and logged.'],
    ['Emails', 'Order emails (receipt, packed, on the way, delivered) are part of the service. Deals emails are only sent if you ask for them, and every one has an unsubscribe link.'],
    ['How long we keep it', 'Account details are kept until you delete your account. Order records are kept as long as Nigerian tax law requires.'],
    ['Your rights', 'Under the Nigeria Data Protection Act 2023 you can see, correct or delete your data, and stop marketing emails at any time from My account, or by messaging us.'],
    ['Contact', contact],
  ];
  const terms: Sec[] = [
    ['Prices', 'Prices are in naira and include packing. Delivery is added at checkout based on your area and order weight. We check every price again when you pay, so the total you see at checkout is the total you pay.'],
    ['Payment', 'Orders are confirmed only after payment goes through on Paystack. If a payment fails or you close the window, no order is placed and nothing is taken.'],
    ['Delivery', pol.delivery || 'We deliver on your area’s set day. Someone needs to be at the address to receive the order.'],
    ['Sold out after you pay', 'Stock is checked when you pay, but if something runs out before packing, we’ll call you to swap it or refund that item in full to your original payment method.'],
    ['Returns and problems', pol.returns || 'If something arrives damaged or missing, message us within 24 hours with a photo and we’ll replace it or refund you.'],
    ['Refunds', 'Refunds go back through Paystack to the card or account you paid with. Banks usually show them within 5 to 10 working days.'],
    ['Contact', contact],
  ];
  const list = kind === 'privacy' ? privacy : terms;
  return (
    <div className="fade" style={{ maxWidth: 760, margin: '0 auto', padding: '48px clamp(16px, 3vw, 28px) 0' }}>
      <div role="tablist" aria-label="Policies" style={{ display: 'flex', gap: 20, marginBottom: 24, fontSize: 14 }}>
        <Link href="/privacy" role="tab" aria-selected={kind === 'privacy'} style={{ fontWeight: 600, color: kind === 'privacy' ? '#0B3A23' : '#66736B', textDecoration: kind === 'privacy' ? 'underline' : 'none', textUnderlineOffset: 6 }}>Privacy policy</Link>
        <Link href="/terms" role="tab" aria-selected={kind === 'terms'} style={{ fontWeight: 600, color: kind === 'terms' ? '#0B3A23' : '#66736B', textDecoration: kind === 'terms' ? 'underline' : 'none', textUnderlineOffset: 6 }}>Terms of sale</Link>
      </div>
      <H1>{kind === 'privacy' ? 'Privacy policy' : 'Terms of sale'}</H1>
      <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#66736B' }}>{b.name}, {b.address}. Last updated November 2026.</p>
      {list.map(([h, t]) => (
        <section key={h} style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 17 }}>{h}</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: '#4D5A52', whiteSpace: 'pre-line' }}>{t}</p>
        </section>
      ))}
    </div>
  );
}
