import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';
import { backInStock } from '@/lib/notify';
import { refreshShop } from '@/lib/refresh';

export const dynamic = 'force-dynamic';
const CATS = ['cereal', 'milk', 'grain', 'food', 'ccombo', 'fcombo'] as const;
const Size = z.object({
  label: z.string().trim().min(1).max(20), price: z.number().int().positive().max(5_000_000).nullable(), sale: z.number().int().positive().nullable().optional(),
  kg: z.number().min(0).max(200), na: z.boolean().optional(), stock: z.number().int().min(0).max(100000).nullable().optional(),
});
const Save = z.object({
  id: z.string().max(40).optional(), name: z.string().trim().min(2, 'Add a product title.').max(80), cat: z.enum(CATS),
  items: z.array(z.string().trim().min(1).max(40)).max(20).nullable().optional(), sizes: z.array(Size).min(1).max(8),
  status: z.enum(['in', 'fast', 'out', 'na']), low: z.number().int().min(0).max(10000).default(3),
  hidden: z.boolean(), img: z.string().max(500).nullable().optional(),
});
const Patch = z.object({
  id: z.string().max(40), hidden: z.boolean().optional(), status: z.enum(['in', 'fast', 'out', 'na']).optional(),
  size: z.string().max(20).optional(), stockDelta: z.number().int().min(-1000).max(1000).optional(), stockSet: z.number().int().min(0).max(100000).optional(),
});
type SizeRow = { label: string; price: number | null; sale: number | null; kg: number; na: boolean; stock?: number | null };
type Row = { id: string; name: string; status: string; sizes: SizeRow[]; stock: number };

const total = (sizes: SizeRow[]) => sizes.reduce((a, s) => a + (s.na ? 0 : s.stock || 0), 0);
const tracked = (sizes: SizeRow[]) => sizes.some(s => !s.na && s.stock != null);
/** Email people waiting on any size that just came back. */
async function tellWaiting(id: string, before: SizeRow[], after: SizeRow[]) {
  for (const s of after) {
    const was = before.find(b => b.label === s.label);
    if (!s.na && (s.stock || 0) > 0 && (!was || (was.stock || 0) <= 0)) await backInStock(id, s.label).catch(e => console.error('back in stock', e));
  }
}

/** Add or edit a product, with stock for each size. */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = Save.parse(await req.json());
  let sizes: SizeRow[] = b.sizes.map(s => ({ label: s.label, price: s.price, sale: s.price && s.sale && s.sale < s.price ? s.sale : null, kg: s.kg, na: !s.price || !!s.na, stock: s.stock ?? null }));
  if (!sizes.some(s => !s.na)) return fail('Add a regular price for at least one size.');
  if (new Set(sizes.map(s => s.label.toLowerCase())).size !== sizes.length) return fail('Two sizes have the same name.');
  if (b.img && !/^(https:\/\/|\/img\/)/.test(b.img)) return fail('Upload the photo again.');
  const combo = b.cat === 'ccombo' || b.cat === 'fcombo';
  if (combo) sizes = [{ ...(sizes.find(s => !s.na) || sizes[0]), label: 'Package' }];
  const stock = total(sizes);
  const row = {
    name: b.name, cat: b.cat, items: combo ? (b.items || []) : null, sizes, low: b.low, hidden: b.hidden, img: b.img || null,
    status: tracked(sizes) && stock === 0 && b.status !== 'na' ? 'out' : b.status === 'out' && stock > 0 ? 'in' : b.status, stock,
    short: b.name.toUpperCase().slice(0, 24), updated_at: new Date().toISOString(),
  };
  let saved: Row;
  if (b.id) {
    const before = must(await db().from('products').select('sizes').eq('id', b.id).maybeSingle()) as { sizes: SizeRow[] } | null;
    if (!before) return fail('Product not found.', 404);
    saved = must(await db().from('products').update(row).eq('id', b.id).select('*').single()) as Row;
    await tellWaiting(b.id, before.sizes, sizes);
  } else {
    const id = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) + '-' + crypto.randomBytes(2).toString('hex');
    saved = must(await db().from('products').insert({ ...row, id, sort: 500 }).select('*').single()) as Row;
  }
  await logAct(me.name, `${b.id ? 'Updated' : 'Added'} ${b.name}`);
  refreshShop();
  return ok({ product: saved });
});

/** Quick changes from the products table: hide/show, status, and stock for one size. */
export const PATCH = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = Patch.parse(await req.json());
  const p = must(await db().from('products').select('id,name,stock,status,sizes').eq('id', b.id).maybeSingle()) as Row | null;
  if (!p) return fail('Product not found.', 404);
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let log = '';
  if (b.hidden !== undefined) { upd.hidden = b.hidden; log = `${b.hidden ? 'Hid' : 'Showed'} ${p.name} ${b.hidden ? 'from' : 'in'} the shop`; }
  if (b.size && (b.stockDelta !== undefined || b.stockSet !== undefined)) {
    const s = p.sizes.find(x => x.label === b.size);
    if (!s) return fail('That size doesn’t exist any more. Refresh.', 404);
    const n = b.stockSet !== undefined ? b.stockSet : Math.max(0, (s.stock || 0) + (b.stockDelta || 0));
    const sizes = p.sizes.map(x => (x.label === b.size ? { ...x, stock: n } : x));
    const t = total(sizes);
    Object.assign(upd, { sizes, stock: t, status: t === 0 && p.status !== 'na' ? 'out' : p.status === 'out' ? 'in' : p.status });
    log = `Set ${p.name}${b.size !== 'Package' ? ' ' + b.size : ''} stock to ${n}`;
    const saved = must(await db().from('products').update(upd).eq('id', b.id).select('*').single());
    await tellWaiting(p.id, p.sizes, sizes);
    await logAct(me.name, log); refreshShop();
    return ok({ product: saved });
  }
  if (b.status) { upd.status = b.status; log = `Set ${p.name} to “${({ in: 'in stock', fast: 'fast selling', out: 'sold out', na: 'not available' } as Record<string, string>)[b.status]}”`; }
  const saved = must(await db().from('products').update(upd).eq('id', b.id).select('*').single());
  if (log) await logAct(me.name, log);
  refreshShop();
  return ok({ product: saved });
});

export const DELETE = handle(async (req: Request) => {
  const me = await requireStaff(req, 'store');
  const id = new URL(req.url).searchParams.get('id') || '';
  const used = (await db().from('orders').select('id', { count: 'exact', head: true }).contains('items', [{ pid: id }])).count || 0;
  if (used) return fail('This product is in past orders, so it can’t be deleted. Hide it instead.');
  const r = must(await db().from('products').delete().eq('id', id).select('name')) as { name: string }[];
  if (r[0]) await logAct(me.name, `Deleted ${r[0].name}`);
  refreshShop();
  return ok({ ok: true });
});
