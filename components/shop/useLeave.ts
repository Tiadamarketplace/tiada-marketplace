'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a drawer or sheet on screen while it slides away, so closing is as smooth as opening (no flash).
 * Returns whether to render it, and whether it is on its way out (add the "out" class then).
 */
export function useLeave<T>(value: T | null | false | undefined, ms = 420): { show: boolean; out: boolean; last: T | null } {
  const open = !!value;
  const [show, setShow] = useState(open);
  const [out, setOut] = useState(false);
  const last = useRef<T | null>(open ? (value as T) : null);
  if (open) last.current = value as T;
  useEffect(() => {
    if (open) { setShow(true); setOut(false); return; }
    if (!show) return;
    setOut(true);
    const t = setTimeout(() => { setShow(false); setOut(false); }, ms);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return { show: open || show, out: !open && out, last: last.current };
}
