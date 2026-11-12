'use client';
import Link from '@/components/shop/Link';
import { useShop } from '../ShopProvider';
import Hero from '../Hero';
import Row from '../Row';
import Slider from '../Slider';
import { AISLES } from '@/lib/shop-client';
import { IBox, ICard, ITruck } from '../Icons';
import Perks from '../Perks';

const WHY = [
  { i: <IBox size={30} color="#0B3A23" stroke={1.4} />, t: 'Sized for your home', s: '250g, 500g, 1kg or a paint bucket' },
  { i: <ICard size={30} color="#0B3A23" stroke={1.4} />, t: 'Pay online, securely', s: 'Card, transfer or USSD through Paystack' },
  { i: <ITruck size={30} color="#0B3A23" stroke={1.4} />, t: 'Delivery in Lagos and Oyo', s: 'Fee by distance, shown before you pay' },
];

export default function Home() {
  const { data, byId, recent } = useShop();
  const P = data.products;
  const by = (f: (c: string) => boolean) => P.filter(p => f(p.cat));
  const seen = recent.map(id => byId[id]).filter(Boolean);
  const slider = data.slider.on && data.slides.length ? <Slider slides={data.slides} seconds={data.slider.seconds} /> : null;
  return (
    <>
      <section aria-label="Why Tiada" style={{ borderBottom: '1px solid #ECE8DF' }}>
        <Perks items={WHY} />
      </section>

      <Hero hero={data.hero} />

      <Row title="Breakfast Cereals" items={by(c => c === 'cereal')} href="/aisle/cereal" />
      <Row title="Cereal Combos" items={by(c => c === 'ccombo')} href="/aisle/ccombo">{slider}</Row>
      {!by(c => c === 'ccombo').length && slider && <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px, 3vw, 28px)' }}>{slider}</div>}
      <Row title="Milk, Oats & Custard" items={by(c => c === 'milk' || c === 'grain')} href="/aisle/milk" />
      <Row title="Foodstuffs" items={by(c => c === 'food')} href="/aisle/food" />
      <Row title="Foodstuff Combos" items={by(c => c === 'fcombo')} href="/aisle/fcombo" />
      {seen.length > 0 && <Row title="Recently viewed" items={seen} />}

      <section aria-labelledby="aisles-h" style={{ maxWidth: 1240, margin: '0 auto', padding: '72px clamp(16px, 3vw, 28px) 0' }}>
        <h2 id="aisles-h" style={{ margin: '0 0 22px', fontWeight: 500, fontSize: 'clamp(22px, 2.4vw, 28px)', letterSpacing: '-0.01em' }}>Shop by aisle</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {AISLES.map(a => (
            <Link key={a.id} href={'/aisle/' + a.id} className="pcard" style={{ display: 'flex', flexDirection: 'column', gap: 12, textDecoration: 'none', color: '#1F2A23' }}>
              <span className="pimg" style={{ display: 'block', aspectRatio: '4 / 5', borderRadius: 6, overflow: 'hidden', background: '#F7F4EC' }}><img src={a.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></span>
              <span className="pname" style={{ fontSize: 15, fontWeight: 500 }}>{a.label} →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
