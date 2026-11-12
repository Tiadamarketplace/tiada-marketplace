'use client';
import { useEffect, useState } from 'react';

/**
 * The strip of reasons under the header. On a computer all three sit side by side;
 * on a phone they take turns in one spot, changing by themselves every few seconds.
 */
export default function Perks({ items }: { items: { i: React.ReactNode; t: string; s: string }[] }) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden && window.matchMedia('(max-width: 820px)').matches) setAt(x => (x + 1) % items.length); }, 3500);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="perks" aria-live="off">
      {items.map((w, k) => (
        <div key={w.t} className={`perk${k === at ? ' on' : k === (at + items.length - 1) % items.length ? ' out' : ''}`}>
          {w.i}<span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><strong style={{ fontSize: 14, fontWeight: 600 }}>{w.t}</strong><span style={{ fontSize: 13, color: '#4E5A53' }}>{w.s}</span></span>
        </div>
      ))}
    </div>
  );
}
