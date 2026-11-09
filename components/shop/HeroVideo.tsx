'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * The moving hero on phones. The still picture shows first; the video (about 0.3 MB, no sound)
 * only loads on phones, never with Data Saver or "reduce motion" on, and fades in once it is playing.
 */
export default function HeroVideo({ src }: { src: string }) {
  const v = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 760px)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const save = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (phone && !calm && !save?.saveData && save?.effectiveType !== '2g' && save?.effectiveType !== 'slow-2g') setOn(true);
  }, []);
  useEffect(() => { if (on) v.current?.play().catch(() => setOn(false)); }, [on]);
  if (!on) return null;
  return (
    <video ref={v} className="hero-img" src={src} muted loop playsInline autoPlay preload="auto" aria-hidden="true" disablePictureInPicture
      onPlaying={() => setShow(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', opacity: show ? 1 : 0, transition: 'opacity .8s ease', animation: 'none' }} />
  );
}
