import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';
import { refreshShop } from '@/lib/refresh';

export const dynamic = 'force-dynamic';
/** Home page slider banners. */
const Save = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().min(2, 'Add a headline.').max(70), eyebrow: z.string().trim().max(40).default(''), text: z.string().trim().max(140).default(''),
  button: z.string().trim().max(24).default('Shop now'),
  style: z.enum(['photo', 'color', 'image']), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Pick a colour.'), shade: z.number().min(0).max(1),
  img: z.string().max(500).nullable().optional(),
  link_type: z.enum(['product', 'aisle', 'deals', 'url']), link_to: z.string().trim().max(300).nullable().optional(),
  starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }), is_on: z.boolean(), sort: z.number().int().min(0).max(1000).default(100),
});
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = Save.parse(await req.json());
  if (b.img && !/^(https:\/\/|\/img\/)/.test(b.img)) return fail('Upload the banner picture again.');
  if (b.style !== 'color' && !b.img) return fail(b.style === 'image' ? 'Upload your finished banner picture.' : 'Add a background picture, or choose “Plain colour”.');
  if (b.link_type === 'url' && b.link_to && !/^https:\/\//.test(b.link_to)) return fail('Links must start with https://');
  if ((b.link_type === 'product' || b.link_type === 'aisle') && !b.link_to) return fail('Choose where the banner should go.');
  if (Date.parse(b.ends_at) <= Date.parse(b.starts_at)) return fail('The end date must be after the start date.');
  const row = {
    title: b.title, eyebrow: b.eyebrow, text: b.text, button: b.button, style: b.style, color: b.color.toUpperCase(), shade: b.shade, img: b.img || null,
    link_type: b.link_type, link_to: b.link_to || null, product_id: b.link_type === 'product' ? b.link_to : null, cls: '',
    starts_at: b.starts_at, ends_at: b.ends_at, is_on: b.is_on, sort: b.sort,
  };
  const saved = b.id ? must(await db().from('promos').update(row).eq('id', b.id).select('*').single()) : must(await db().from('promos').insert(row).select('*').single());
  await logAct(me.name, `${b.id ? 'Updated' : 'Added'} banner “${b.title}”${b.is_on ? '' : ' (off)'}`);
  refreshShop();
  return ok({ promo: saved });
});
export const PATCH = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = z.object({ id: z.string().max(40), is_on: z.boolean().optional(), sort: z.number().int().min(0).max(1000).optional() }).parse(await req.json());
  const upd: Record<string, unknown> = {};
  if (b.is_on !== undefined) upd.is_on = b.is_on;
  if (b.sort !== undefined) upd.sort = b.sort;
  const p = must(await db().from('promos').update(upd).eq('id', b.id).select('title').single()) as { title: string };
  if (b.is_on !== undefined) await logAct(me.name, `${b.is_on ? 'Switched on' : 'Switched off'} banner “${p.title}”`);
  refreshShop();
  return ok({ ok: true });
});
export const DELETE = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const id = new URL(req.url).searchParams.get('id') || '';
  const p = must(await db().from('promos').delete().eq('id', id).select('title')) as { title: string }[];
  if (p[0]) await logAct(me.name, `Deleted banner “${p[0].title}”`);
  refreshShop();
  return ok({ ok: true });
});
