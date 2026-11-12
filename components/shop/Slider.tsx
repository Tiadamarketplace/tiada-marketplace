'use client';
import Link from '@/components/shop/Link';
import { useEffect, useRef, useState } from 'react';
import type { Slide } from '@/lib/storefront';
import { IChevron } from './Icons';

function tone(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); const n = m ? parseInt(m[1], 16) : 0x0b3a23;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return { r, g, b, light: 0.299 * r + 0.587 * g + 0.114 * b > 150 };
}

export default function Slider({ slides, seconds = 6 }: { slides: Slide[]; seconds?: number }) {
  const n = slides.length;
  const [cur, setCur] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const to = (i: number) => { setCur(((i % n) + n) % n); setTick(t => t + 1); };
  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setTimeout(() => to(cur + 1), seconds * 1000);
    return () => clearTimeout(t);
  }, [cur, tick, paused, n, seconds]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return null;
  const now = slides[cur]; const nt = tone(now.color); const lightDots = now.style === 'color' && nt.light;
  // banners made with their words and logo already in the picture are shown whole, never cropped (16:9)
  const pictureOnly = slides.every(x => x.style === 'image');

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Offers and news"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={e => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={e => { const s = touch.current; touch.current = null; setPaused(false); if (s == null) return; const d = e.changedTouches[0].clientX - s; if (Math.abs(d) > 40) to(cur + (d < 0 ? 1 : -1)); }}
      style={{ position: 'relative', marginTop: 64, ...(pictureOnly ? { aspectRatio: '16 / 9', maxWidth: 1000, marginLeft: 'auto', marginRight: 'auto' } : { height: 'clamp(240px, 34vw, 400px)' }), borderRadius: 8, overflow: 'hidden', background: '#0B3A23' }}>
      {slides.map((x, i) => {
        const t = tone(x.color); const rgba = (a: number) => `rgba(${t.r},${t.g},${t.b},${a})`;
        const light = x.style === 'color' ? t.light : t.light && x.shade > 0.5;
        const on = i === cur; const ext = /^https?:\/\//.test(x.href);
        const inner = (
          <>
            {x.img && x.style !== 'color' && <img src={x.img} alt={x.style === 'image' ? x.title : ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: x.style === 'image' && !pictureOnly ? 'contain' : 'cover', transform: x.style === 'image' ? 'none' : `scale(${on ? 1 : 1.06})`, transition: 'transform 7s ease-out' }} />}
            {x.style === 'photo' && <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${rgba(x.shade)} 0%, ${rgba(x.shade * 0.78)} 42%, ${rgba(0)} 80%)` }} />}
            {x.style === 'color' && <><span style={{ position: 'absolute', inset: 0, background: x.color }} /><span style={{ position: 'absolute', inset: 0, background: 'radial-gradient(90% 120% at 90% 30%, rgba(255,255,255,0.16), rgba(255,255,255,0) 60%)' }} /></>}
            {x.style !== 'image' && (
              <span style={{ position: 'relative', height: '100%', maxWidth: 'min(560px, 82%)', padding: '0 clamp(22px, 5vw, 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, color: light ? '#0B3A23' : '#FFFFFF' }}>
                {x.kicker && <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: light ? '#0B3A23' : '#E9B969' }}>{x.kicker}</span>}
                <span className="serif" style={{ fontSize: 'clamp(28px, 4.2vw, 48px)', lineHeight: 1.05 }}>{x.title}</span>
                {x.text && <span className="hide-xs" style={{ fontSize: 'clamp(14px, 1.4vw, 16px)', lineHeight: 1.6, opacity: 0.88 }}>{x.text}</span>}
                {x.button && <span style={{ alignSelf: 'flex-start', marginTop: 8, height: 46, padding: '0 22px', borderRadius: 4, background: light ? '#0B3A23' : '#D49B41', color: light ? '#FFFFFF' : '#0B3A23', fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center' }}>{x.button}</span>}
              </span>
            )}
          </>
        );
        const style: React.CSSProperties = { position: 'absolute', inset: 0, display: 'block', color: '#FFFFFF', textDecoration: 'none', opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden', transition: 'opacity .7s ease, visibility .7s' };
        const a11y = { role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${n}: ${x.title}`, 'aria-hidden': !on, tabIndex: on ? 0 : -1 } as const;
        return ext
          ? <a key={x.id} href={x.href} target="_blank" rel="noopener" {...a11y} style={style}>{inner}</a>
          : <Link key={x.id} href={x.href} {...a11y} style={style}>{inner}</Link>;
      })}
      {n > 1 && (
        <>
          {[-1, 1].map(d => (
            <button key={d} type="button" className="ub promo-arrow" aria-label={d < 0 ? 'Previous slide' : 'Next slide'} onClick={() => to(cur + d)}
              style={{ position: 'absolute', right: d < 0 ? 72 : 20, bottom: 20, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IChevron dir={d < 0 ? 'left' : 'right'} size={20} color="#1F2A23" stroke={2} />
            </button>
          ))}
          <div style={{ position: 'absolute', left: 'clamp(22px, 5vw, 56px)', bottom: 22, display: 'flex', gap: 8 }}>
            {slides.map((x, i) => (
              <button key={x.id} type="button" className="ub" aria-label={`Show slide ${i + 1}`} aria-current={i === cur} onClick={() => to(i)} style={{ width: 34, height: 24, display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'relative', width: '100%', height: 3, borderRadius: 3, background: lightDots ? 'rgba(11,58,35,0.25)' : 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
                  <span key={i === cur ? 'run' + tick : 'idle'} className={i === cur ? 'dotrun dr0' : ''} style={{ position: 'absolute', inset: 0, background: lightDots ? '#0B3A23' : '#FFFFFF', transformOrigin: 'left', transform: `scaleX(${i < cur ? 1 : 0})`, animationDuration: seconds + 's', animationPlayState: paused ? 'paused' : 'running' }} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
