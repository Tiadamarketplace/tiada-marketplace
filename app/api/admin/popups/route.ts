import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';
import { refreshShop } from '@/lib/refresh';

export const dynamic = 'force-dynamic';
const Save = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, 'Give it a name.').max(70), text: z.string().trim().max(200).default(''),
  img: z.string().max(500).nullable().optional(), button: z.string().trim().max(24).default(''), href: z.string().trim().max(300).default(''),
  audience: z.enum(['all', 'visitors', 'customers']), freq: z.enum(['once', 'daily', 'visit']), delay: z.number().int().min(0).max(120),
  starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }), is_on: z.boolean(),
});
const missing = (e: { message?: string } | null) => !!e && /popups/.test(e.message || '') && /(does not exist|schema cache)/.test(e.message || '');
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = Save.parse(await req.json());
  if (b.img && !/^(https:\/\/|\/img\/)/.test(b.img)) return fail('Upload the picture again.');
  if (!b.img && !b.text) return fail('Upload a picture or write a message.');
  if (b.href && !/^(https:\/\/|\/)/.test(b.href)) return fail('The link must start with / (a page on your site) or https://');
  if (Date.parse(b.ends_at) <= Date.parse(b.starts_at)) return fail('The end must be after the start.');
  const row = { title: b.title, text: b.text, img: b.img || null, button: b.button, href: b.href, audience: b.audience, freq: b.freq, delay: b.delay, starts_at: b.starts_at, ends_at: b.ends_at, is_on: b.is_on };
  const r = b.id ? await db().from('popups').update(row).eq('id', b.id).select('*').single() : await db().from('popups').insert(row).select('*').single();
  if (missing(r.error)) return fail('Pop-ups need a quick database update first: run 2026-11-chat-carts-popups.sql in Supabase.');
  const saved = must(r);
  await logAct(me.name, `${b.id ? 'Updated' : 'Added'} pop-up “${b.title}”${b.is_on ? '' : ' (off)'}`);
  refreshShop();
  return ok({ popup: saved });
});
export const PATCH = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = z.object({ id: z.string().uuid(), is_on: z.boolean() }).parse(await req.json());
  const p = must(await db().from('popups').update({ is_on: b.is_on }).eq('id', b.id).select('title').single()) as { title: string };
  await logAct(me.name, `${b.is_on ? 'Switched on' : 'Switched off'} pop-up “${p.title}”`);
  refreshShop();
  return ok({ ok: true });
});
export const DELETE = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const id = new URL(req.url).searchParams.get('id') || '';
  const p = must(await db().from('popups').delete().eq('id', id).select('title')) as { title: string }[];
  if (p[0]) await logAct(me.name, `Deleted pop-up “${p[0].title}”`);
  refreshShop();
  return ok({ ok: true });
});
