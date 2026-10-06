/** Keeps a hidden frame "loading" while the site's loading overlay is on screen, so the browser's own
 *  loading indicator (tab spinner / progress bar) shows too. The page removes the frame when the overlay hides. */
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      c.enqueue(enc.encode('<!doctype html><meta charset="utf-8"><title>loading</title>'));
      const end = Date.now() + 25000;
      while (Date.now() < end && !req.signal.aborted) {
        await new Promise(r => setTimeout(r, 1000));
        try { c.enqueue(enc.encode(' ')); } catch { break; }
      }
      try { c.close(); } catch { /* already closed */ }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
