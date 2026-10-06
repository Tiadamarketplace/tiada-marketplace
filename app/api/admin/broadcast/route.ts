import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';
import { layout, sendBatch, sendEmail, esc } from '@/lib/email';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const Body = z.object({ subject: z.string().trim().min(3, 'Add a subject.').max(80), body: z.string().trim().min(10, 'Write a longer message.').max(1500), audience: z.enum(['promo', 'all', 'test']) });

/** promo = only customers who opted in to promotions. all = service notices (delivery changes, holiday hours) to every customer. test = only you. */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'broadcast');
  const b = Body.parse(await req.json());
  const html = layout({ heading: b.subject, bodyHtml: `<p style="margin:0 0 12px">${esc(b.body).replace(/\n/g, '<br>')}</p>`, cta: { label: 'Open Tiada Marketplace', url: env.siteUrl } });
  if (b.audience === 'test') {
    const r = await sendEmail(me.email, '[Test] ' + b.subject, html);
    if (!r.ok) return fail('Test email failed: ' + (r.error || 'unknown error'));
    return ok({ sent: 1, total: 1 });
  }
  let q = db().from('customers').select('id,email');
  if (b.audience === 'promo') q = q.eq('promo_ok', true);
  const list = must(await q) as { id: string; email: string }[];
  if (!list.length) return fail(b.audience === 'promo' ? 'No customers have opted in to promotions yet.' : 'No customers yet.');
  const { sent } = await sendBatch(list.map(c => ({ to: c.email, subject: b.subject, html })));
  await db().from('messages').insert(list.map(c => ({ customer_id: c.id, kind: 'promo', title: b.subject, body: b.body.slice(0, 600), email_to: c.email, email_ok: sent > 0 })));
  await db().from('broadcasts').insert({ subject: b.subject, body: b.body, audience: b.audience, sent, staff_name: me.name });
  await logAct(me.name, `Broadcast “${b.subject}” to ${b.audience === 'promo' ? 'customers who opted in' : 'all customers'} (${sent} of ${list.length} sent)`);
  return ok({ sent, total: list.length });
});
