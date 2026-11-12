import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { requireStaff, logAct } from '@/lib/staff';
import { setSetting } from '@/lib/catalog';
import { refreshShop } from '@/lib/refresh';

export const dynamic = 'force-dynamic';
const Href = z.string().trim().max(300).refine(v => /^(\/|https:\/\/|tel:|mailto:|https:\/\/wa\.me\/)/.test(v), 'Each button link must start with / (a page on your site) or https://');
const Button = z.object({ label: z.string().trim().min(1, 'Every button needs words.').max(28), href: Href, look: z.enum(['gold', 'green', 'white', 'link']) });
const Img = z.string().max(500).refine(v => /^(https:\/\/|\/img\/)/.test(v), 'Upload the picture again.').nullable();
const Slide = z.object({
  id: z.string().max(40).optional(), on: z.boolean(), layout: z.enum(['back', 'front', 'image']),
  kicker: z.string().trim().max(50).default(''), title: z.string().trim().max(90).default(''), text: z.string().trim().max(220).default(''),
  img: Img, imgPhone: Img.default(null), bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0B3A23'),
  buttons: z.array(Button).max(3), starts: z.string().datetime({ offset: true }).nullable().default(null), ends: z.string().datetime({ offset: true }).nullable().default(null),
});
const Body = z.object({ main: z.boolean(), seconds: z.number().int().min(3).max(15), slides: z.array(Slide).max(12) });

/** Save the whole hero: the built-in slide on/off, how long each slide shows, and the slides in order. */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'catalog');
  const b = Body.parse(await req.json());
  for (const s of b.slides) {
    if (s.layout !== 'image' && !s.title) return fail('Every slide needs a headline (or choose “Finished banner”).');
    if (s.layout !== 'front' && s.layout !== 'image' && !s.img) return fail('“Picture behind” slides need a picture.');
    if (s.layout === 'image' && !s.img) return fail('Upload your finished banner picture.');
    if (s.starts && s.ends && Date.parse(s.ends) <= Date.parse(s.starts)) return fail('A slide’s end must be after its start.');
  }
  if (!b.main && !b.slides.some(s => s.on)) return fail('Keep at least one slide showing: switch on a slide or the Tiada welcome slide.');
  const value = { ...b, slides: b.slides.map(s => ({ ...s, id: s.id || crypto.randomBytes(5).toString('hex') })) };
  await setSetting('hero', value);
  await logAct(me.name, 'Updated the home page hero');
  refreshShop();
  return ok({ hero: value });
});
