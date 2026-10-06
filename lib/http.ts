import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Wrap a route so thrown errors become clean JSON instead of a crash page. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try { return await fn(...args); }
    catch (e) {
      if (e instanceof ZodError) return fail(e.issues[0]?.message || 'Check the details and try again.', 400);
      if (e instanceof HttpError) return fail(e.message, e.status);
      console.error(e);
      return fail('Something went wrong on our side. Please try again.', 500);
    }
  };
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

/** Small in-memory limiter (per server instance). Good enough to slow down abuse on Vercel. */
const buckets = new Map<string, { n: number; t: number }>();
export function limit(key: string, max: number, windowMs: number) {
  const now = Date.now(), b = buckets.get(key);
  if (!b || now - b.t > windowMs) { buckets.set(key, { n: 1, t: now }); return; }
  b.n++;
  if (b.n > max) throw new HttpError(429, 'Too many attempts. Please wait a minute and try again.');
}
