import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';

export const dynamic = 'force-dynamic';
/** Discount codes. */
const Save = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, 'Codes are 3 to 20 letters or numbers, no spaces.'),
  kind: z.enum(['amt', 'pct']), value: z.number().int().positive('Enter how much it takes off.'), cap: z.number().int().positive().nullable().optional(),
  min_order: z.number().int().min(0).default(0), ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  max_uses: z.number().int().positive().nullable().optional(), once_each: z.boolean(), is_on: z.boolean(), isNew: z.boolean().optional(),
});
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'store');
  const b = Save.parse(await req.json());
  if (b.kind === 'pct' && b.value > 90) return fail('A percent code can take off at most 90%.');
  const row = { code: b.code, kind: b.kind, value: b.value, cap: b.kind === 'pct' ? b.cap || null : null, min_order: b.min_order, ends_at: b.ends_at || null, max_uses: b.max_uses || null, once_each: b.once_each, is_on: b.is_on };
  if (b.isNew) {
    const exists = (await db().from('vouchers').select('code').eq('code', b.code).maybeSingle()).data;
    if (exists) return fail(`${b.code} already exists.`);
    must(await db().from('vouchers').insert(row));
  } else must(await db().from('vouchers').update(row).eq('code', b.code));
  await logAct(me.name, `${b.isNew ? 'Created' : 'Updated'} discount code ${b.code}`);
  return ok({ voucher: (await db().from('vouchers').select('*').eq('code', b.code).single()).data });
});
export const PATCH = handle(async (req: Request) => {
  const me = await requireStaff(req, 'store');
  const b = z.object({ code: z.string().max(20), is_on: z.boolean() }).parse(await req.json());
  must(await db().from('vouchers').update({ is_on: b.is_on }).eq('code', b.code));
  await logAct(me.name, `${b.is_on ? 'Switched on' : 'Paused'} discount code ${b.code}`);
  return ok({ ok: true });
});
export const DELETE = handle(async (req: Request) => {
  const me = await requireStaff(req, 'store');
  const code = (new URL(req.url).searchParams.get('code') || '').toUpperCase();
  must(await db().from('vouchers').delete().eq('code', code));
  await logAct(me.name, `Deleted discount code ${code}`);
  return ok({ ok: true });
});
