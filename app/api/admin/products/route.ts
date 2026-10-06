import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';

export const dynamic = 'force-dynamic';
const CATS = ['cereal', 'milk', 'grain', 'ccombo', 'fcombo'] as const;
const Size = z.object({ label: z.string().trim().min(1).max(20), price: z.number().int().positive().max(5_000_000).nullable(), sale: z.number().int().positive().nullable().optional(), kg: z.number().min(0).max(200), na: z.boolean().optional() });
const Save = z.object({
  id: z.string().max(40).optional(), name: z.string().trim().min(2, 'Add a product title.').max(80), cat: z.enum(CATS),
  items: z.array(z.string().trim().min(1).max(40)).max(20).nullable().optional(), sizes: z.array(Size).min(1).max(6),
  status: z.enum(['in', 'fast', 'out', 'na']), stock: z.number().int().min(0).max(100000), low: z.number().int().min(0).max(10000),
  hidden: z.boolean(), img: z.string().max(500).nullable().optional(),
});
const Patch = z.object({ id: z.string().max(40), hidden: z.boolean().optional(), stockDelta: z.number().int().min(-1000).max(1000).optional(), status: z.enum(['in', 'fast', 'out', 'na']).optional() });

/** Add or edit a product. */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = Save.parse(await req.json());
  const sizes = b.sizes.map(s => ({ label: s.label, price: s.price, sale: s.price && s.sale && s.sale < s.price ? s.sale : null, kg: s.kg, na: !s.price }));
  if (!sizes.some(s => !s.na)) return fail('Add a regular price for at least one size.');
  if (b.img && !/^(https:\/\/|\/img\/)/.test(b.img)) return fail('Upload the photo again.');
  const combo = b.cat === 'ccombo' || b.cat === 'fcombo';
  const row = {
    name: b.name, cat: b.cat, items: combo ? (b.items || []) : null,
    sizes: combo ? [{ ...(sizes.find(s => !s.na) || sizes[0]), label: 'Package' }] : sizes,
    status: b.stock === 0 && b.status !== 'na' ? 'out' : b.status, stock: b.stock, low: b.low, hidden: b.hidden, img: b.img || null,
    short: b.name.toUpperCase().slice(0, 24), updated_at: new Date().toISOString(),
  };
  let saved;
  if (b.id) {
    saved = must(await db().from('products').update(row).eq('id', b.id).select('*').maybeSingle());
    if (!saved) return fail('Product not found.', 404);
  } else {
    const id = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) + '-' + crypto.randomBytes(2).toString('hex');
    saved = must(await db().from('products').insert({ ...row, id, sort: 500 }).select('*').single());
  }
  await logAct(me.name, `${b.id ? 'Updated' : 'Added'} ${b.name}`);
  return ok({ product: saved });
});

/** Quick changes from the inventory table: hide/show, +/- stock, status. */
export const PATCH = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = Patch.parse(await req.json());
  const p = must(await db().from('products').select('id,name,stock,status').eq('id', b.id).maybeSingle()) as { id: string; name: string; stock: number; status: string } | null;
  if (!p) return fail('Product not found.', 404);
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let log = '';
  if (b.hidden !== undefined) { upd.hidden = b.hidden; log = `${b.hidden ? 'Hid' : 'Showed'} ${p.name} ${b.hidden ? 'from' : 'in'} the shop`; }
  if (b.stockDelta) {
    const n = Math.max(0, p.stock + b.stockDelta); upd.stock = n;
    if (n === 0) upd.status = 'out'; else if (p.status === 'out') upd.status = 'in';
    log = `Set ${p.name} stock to ${n}`;
  }
  if (b.status) { upd.status = b.status; if (b.status === 'out') upd.stock = 0; log = `Set ${p.name} to “${b.status}”`; }
  const saved = must(await db().from('products').update(upd).eq('id', b.id).select('*').single());
  if (log && !b.stockDelta) await logAct(me.name, log);
  return ok({ product: saved });
});
