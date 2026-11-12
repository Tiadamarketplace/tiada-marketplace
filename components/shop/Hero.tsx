'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '@/components/shop/Link';
import HeroVideo from './HeroVideo';
import type { HeroButton, HeroSettings, HeroSlide } from '@/lib/hero-core';

/** Dark or light colour? Decides white or dark words on a "picture beside" slide. */
function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function Btn({ b, dark, first }: { b: HeroButton; dark: boolean; first: boolean }) {
  const ext = /^https:/.test(b.href);
  const base: React.CSSProperties = { height: 50, padding: '0 28px', borderRadius: 4, fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' };
  const look: Record<HeroButton['look'], React.CSSProperties> = {
    gold: { ...base, background: '#D49B41', color: '#0B3A23' },
    green: { ...base, background: '#0B3A23', color: '#FFFFFF', boxShadow: dark ? 'inset 0 0 0 1.5px rgba(255,255,255,0.55)' : undefined },
    white: { ...base, background: '#FFFFFF', color: '#0B3A23' },
    link: { fontWeight: 600, fontSize: 15, color: dark ? '#FFFFFF' : '#0B3A23' },
  };
  const cls = b.look === 'link' ? 'lnk' : `ub press ${b.look === 'gold' ? 'btn-gold' : 'btn-solid'}`;
  return ext
    ? <a href={b.href} target="_blank" rel="noopener" className={cls} style={look[b.look]} tabIndex={first ? undefined : undefined}>{b.label}</a>
    : <Link href={b.href} className={cls} style={look[b.look]}>{b.label}</Link>;
}

function Words({ s, dark, h1 }: { s: Pick<HeroSlide, 'kicker' | 'title' | 'text' | 'buttons'>; dark: boolean; h1: boolean }) {
  const H = h1 ? 'h1' : 'h2';
  return (
    <div style={{ maxWidth: 540, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18, padding: '48px 0' }}>
      {s.kicker && <span className="hero-kick" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D49B41' }}>{s.kicker}</span>}
      <H className="serif" style={{ margin: 0, fontSize: 'clamp(38px, 5.4vw, 66px)', lineHeight: 1.03, letterSpacing: '-0.01em', color: dark ? '#FFFFFF' : '#1F2A23', textShadow: dark ? '0 2px 24px rgba(0,0,0,0.25)' : undefined }}>{s.title}</H>
      {s.text && <p style={{ margin: 0, maxWidth: 470, fontSize: 16, lineHeight: 1.7, color: dark ? 'rgba(255,255,255,0.88)' : '#3C4741' }}>{s.text}</p>}
      {s.buttons.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 24px', marginTop: 6 }}>{s.buttons.map((b, i) => <Btn key={i} b={b} dark={dark} first={i === 0} />)}</div>}
    </div>
  );
}

const box: React.CSSProperties = { position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px, 3vw, 28px)', minHeight: 'clamp(460px, 44vw, 600px)', display: 'flex', alignItems: 'center' };

/** The original Tiada welcome slide. */
function MainSlide({ active, h1 }: { active: boolean; h1: boolean }) {
  return (
    <>
      <picture><source media="(max-width: 760px)" srcSet="/img/hero-phone.jpg" /><img className="hero-img" src="/img/hero.jpg" alt="A bowl of chocolate cereal balls splashing in milk, with a tin of Milo behind it" fetchPriority="high" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '70% center', display: 'block' }} /></picture>
      {active && <HeroVideo src="/img/hero-phone.mp4" />}
      <div className="hero-shade" aria-hidden="true" style={{ position: 'absolute', inset: 0 }} />
      <div className="hero-box" style={box}>
        <Words h1={h1} dark s={{ kicker: 'Tiada Marketplace · Lagos & Oyo', title: 'Foodstuffs and cereals, packed for your home.', text: 'Breakfast cereals by weight, ready-made combos and pantry staples, packed at our hub and brought to your door in Lagos and Oyo.', buttons: [{ label: 'Shop cereals', href: '/aisle/cereal', look: 'gold' }, { label: 'See the combos', href: '/aisle/ccombo', look: 'link' }] }} />
      </div>
    </>
  );
}

function CustomSlide({ s, h1, eager }: { s: HeroSlide; h1: boolean; eager: boolean }) {
  const pic = (style: React.CSSProperties, alt: string, cls?: string) => s.img
    ? <picture>{s.imgPhone && <source media="(max-width: 760px)" srcSet={s.imgPhone} />}<img className={cls} src={s.img} alt={alt} loading={eager ? 'eager' : 'lazy'} style={style} /></picture>
    : null;
  if (s.layout === 'back') return (
    <>
      {pic({ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '70% center', display: 'block' }, '', 'hero-img')}
      <div className="hero-shade" aria-hidden="true" style={{ position: 'absolute', inset: 0 }} />
      <div className="hero-box" style={box}><Words s={s} dark h1={h1} /></div>
    </>
  );
  if (s.layout === 'front') {
    const dark = isDark(s.bg);
    return (
      <div style={{ background: s.bg, height: '100%' }}>
        <div className="hero-front" style={{ ...box, gap: 'clamp(20px, 4vw, 56px)' }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}><Words s={s} dark={dark} h1={h1} /></div>
          {s.img && <div className="hero-front-pic" style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', padding: '32px 0' }}>{pic({ maxWidth: '100%', maxHeight: 'clamp(300px, 36vw, 500px)', objectFit: 'contain', display: 'block' }, s.title)}</div>}
        </div>
      </div>
    );
  }
  // a finished banner: shown whole; tapping it opens the first button's link
  const first = s.buttons[0];
  const img = pic({ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }, s.title || 'Tiada banner');
  return (
    <div style={{ position: 'absolute', inset: 0, background: s.bg, overflow: 'hidden' }}>
      {/* where the banner doesn't fill the space (phones), a soft blurred copy fills the rest instead of empty bars */}
      {s.img && <img src={s.imgPhone || s.img} alt="" aria-hidden="true" className="hero-blur" style={{ position: 'absolute', inset: -40, width: 'calc(100% + 80px)', height: 'calc(100% + 80px)', objectFit: 'cover', filter: 'blur(28px) brightness(.75)', transform: 'scale(1.05)' }} />}
      {first ? (/^https:/.test(first.href) ? <a href={first.href} target="_blank" rel="noopener" aria-label={first.label} style={{ position: 'absolute', inset: 0 }}>{img}</a> : <Link href={first.href} aria-label={first.label} style={{ position: 'absolute', inset: 0 }}>{img}</Link>) : img}
      {h1 && <h1 className="sr-only">{s.title || 'Tiada Marketplace'}</h1>}
    </div>
  );
}

/** The home page hero: one slide, or a gentle cross-fading slider when Admin has added more. */
export default function Hero({ hero }: { hero?: HeroSettings }) {
  const list: (HeroSlide | 'main')[] = [...((hero?.main ?? true) ? ['main' as const] : []), ...(hero?.slides || [])];
  if (!list.length) list.push('main');
  const n = list.length;
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const go = useCallback((i: number) => setAt(((i % n) + n) % n), [n]);
  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => go(at + 1), Math.max(3, hero?.seconds || 7) * 1000);
    return () => clearTimeout(t);
  }, [at, n, paused, go, hero?.seconds]);

  return (
    <section aria-label="Welcome" aria-roledescription={n > 1 ? 'carousel' : undefined} className="hero" style={{ position: 'relative', overflow: 'hidden', background: '#0B3A23' }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}
      onTouchStart={e => { touch.current = e.touches[0].clientX; }} onTouchEnd={e => { if (touch.current == null) return; const d = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(d) > 50) go(at + (d < 0 ? 1 : -1)); }}>
      <div style={{ display: 'grid' }}>
        {list.map((s, i) => {
          const on = i === at;
          return (
            <div key={s === 'main' ? 'main' : s.id} aria-hidden={!on} {...(n > 1 ? { role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${n}` } : {})}
              className="hero-slot" style={{ gridArea: '1 / 1', position: 'relative', opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden', transition: on ? 'opacity .9s ease, visibility 0s' : 'opacity .9s ease, visibility 0s .9s', zIndex: on ? 1 : 0 }}>
              {s === 'main' ? <MainSlide active={on} h1={i === 0} /> : <CustomSlide s={s} h1={i === 0} eager={i === 0} />}
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <>
          <button type="button" className="ub hero-arrow" aria-label="Previous slide" onClick={() => go(at - 1)} style={{ left: 14 }}>‹</button>
          <button type="button" className="ub hero-arrow" aria-label="Next slide" onClick={() => go(at + 1)} style={{ right: 14 }}>›</button>
          <div style={{ position: 'absolute', zIndex: 3, left: 0, right: 0, bottom: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {list.map((_, i) => <button key={i} type="button" className="ub" aria-label={`Show slide ${i + 1}`} aria-current={i === at} onClick={() => go(i)} style={{ width: i === at ? 26 : 9, height: 9, borderRadius: 999, background: i === at ? '#D49B41' : 'rgba(255,255,255,0.6)', boxShadow: '0 1px 4px rgba(0,0,0,.25)', transition: 'width .3s ease, background .3s ease' }} />)}
          </div>
        </>
      )}
    </section>
  );
}
