import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';

export const dynamic = 'force-dynamic';
const Save = z.object({
  id: z.string().max(40).optional(), title: z.string().trim().min(2, 'Add a headline.').max(40), eyebrow: z.string().trim().max(40).default(''),
  text: z.string().trim().max(90).default(''), product_id: z.string().max(40).nullable(), img: z.string().max(500).nullable().optional(),
  cls: z.string().max(10).default(''), ends_at: z.string().datetime({ offset: true }), is_on: z.boolean(),
});
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = Save.parse(await req.json());
  if (b.img && !/^https:\/\//.test(b.img)) return fail('Upload the banner picture again.');
  const row = { title: b.title, eyebrow: b.eyebrow, text: b.text, product_id: b.product_id, img: b.img || null, cls: b.cls, ends_at: b.ends_at, is_on: b.is_on };
  const saved = b.id ? must(await db().from('promos').update(row).eq('id', b.id).select('*').single()) : must(await db().from('promos').insert(row).select('*').single());
  await logAct(me.name, `${b.id ? 'Updated' : 'Launched'} flash sale “${b.title}”${b.is_on ? '' : ' (switched off)'}`);
  return ok({ promo: saved });
});
export const PATCH = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = z.object({ id: z.string().max(40), is_on: z.boolean() }).parse(await req.json());
  const p = must(await db().from('promos').update({ is_on: b.is_on }).eq('id', b.id).select('title').single()) as { title: string };
  await logAct(me.name, `${b.is_on ? 'Switched on' : 'Switched off'} flash sale “${p.title}”`);
  return ok({ ok: true });
});
export const DELETE = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const id = new URL(req.url).searchParams.get('id') || '';
  const p = must(await db().from('promos').delete().eq('id', id).select('title')) as { title: string }[];
  if (p[0]) await logAct(me.name, `Deleted flash sale “${p[0].title}”`);
  return ok({ ok: true });
});
