import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { requireStaff, logAct } from '@/lib/staff';
import { setSetting } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
const SECTIONS = ['slider', 'tiles', 'flash', 'aisles', 'cereals', 'ccombos', 'milk', 'fcombos', 'recent', 'recs', 'note'] as const;
const Body = z.discriminatedUnion('key', [
  z.object({ key: z.literal('layout'), value: z.array(z.tuple([z.enum(SECTIONS), z.boolean()])).max(20), log: z.string().max(200).optional() }),
  z.object({ key: z.literal('tiles'), value: z.record(z.enum(['wa', 'student', 'track']), z.boolean()), log: z.string().max(200).optional() }),
  z.object({ key: z.literal('aisles'), value: z.record(z.enum(['cereal', 'milk', 'grain', 'ccombo', 'fcombo', 'sort']), z.boolean()), log: z.string().max(200).optional() }),
  z.object({ key: z.literal('store'), value: z.object({ whatsapp: z.string().max(20), tiktok: z.string().max(40), email: z.string().max(80), hub: z.string().max(160) }), log: z.string().max(200).optional() }),
  z.object({ key: z.literal('vouchers'), value: z.record(z.string().regex(/^[A-Z0-9]{3,20}$/), z.number().int().min(0).max(100000)), log: z.string().max(200).optional() }),
]);

/** Home page layout, tiles, aisles, store contact details and voucher codes. */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'store');
  const b = Body.parse(await req.json());
  await setSetting(b.key, b.value);
  await logAct(me.name, b.log || `Updated ${b.key}`);
  return ok({ ok: true });
});
