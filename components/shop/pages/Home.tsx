'use client';
import Link from '@/components/shop/Link';
import { useShop } from '../ShopProvider';
import HeroVideo from '../HeroVideo';
import Row from '../Row';
import Slider from '../Slider';
import { AISLES } from '@/lib/shop-client';
import { IBox, ICard, ITruck } from '../Icons';

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
        <div className="noscroll" style={{ maxWidth: 1240, margin: '0 auto', padding: '16px clamp(16px, 3vw, 28px)', display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(250px, 1fr)', gap: 20, overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
          {WHY.map(w => (
            <div key={w.t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, scrollSnapAlign: 'start' }}>
              {w.i}<span style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ fontSize: 14, fontWeight: 600 }}>{w.t}</strong><span style={{ fontSize: 13, color: '#66736B' }}>{w.s}</span></span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Welcome" style={{ position: 'relative', overflow: 'hidden', background: '#0B3A23' }}>
        <picture><source media="(max-width: 760px)" srcSet="/img/hero-phone.jpg" /><img className="hero-img" src="/img/hero.jpg" alt="A bowl of chocolate cereal balls splashing in milk, with a tin of Milo behind it" fetchPriority="high" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '70% center', display: 'block' }} /></picture>
        <HeroVideo src="/img/hero-phone.mp4" />
        <div className="hero-shade" aria-hidden="true" style={{ position: 'absolute', inset: 0 }} />
        <div className="hero-box" style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px, 3vw, 28px)', minHeight: 'clamp(460px, 44vw, 600px)', display: 'flex', alignItems: 'center' }}>
          <div className="fade" style={{ maxWidth: 540, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18, padding: '48px 0' }}>
            <span className="hero-kick" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D49B41' }}>Tiada Marketplace · Lagos &amp; Oyo</span>
            <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(40px, 5.6vw, 68px)', lineHeight: 1.02, letterSpacing: '-0.01em', color: '#FFFFFF', textShadow: '0 2px 24px rgba(0,0,0,0.25)' }}>Foodstuffs and cereals, packed for your home.</h1>
            <p style={{ margin: 0, maxWidth: 470, fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.88)' }}>Breakfast cereals by weight, ready-made combos and pantry staples, packed at our hub and brought to your door in Lagos and Oyo.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 24px', marginTop: 6 }}>
              <Link href="/aisle/cereal" className="ub btn-gold press" style={{ height: 50, padding: '0 30px', borderRadius: 4, background: '#D49B41', color: '#0B3A23', fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center' }}>Shop cereals</Link>
              <Link href="/aisle/ccombo" className="lnk" style={{ fontWeight: 600, fontSize: 15, color: '#FFFFFF' }}>See the combos</Link>
            </div>
          </div>
        </div>
      </section>

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
