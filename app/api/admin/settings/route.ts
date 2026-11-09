import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { requireStaff, logAct } from '@/lib/staff';
import { setSetting } from '@/lib/catalog';
import { refreshShop } from '@/lib/refresh';

export const dynamic = 'force-dynamic';
const S = (n: number) => z.string().trim().max(n);
const Time = z.string().regex(/^\d{2}:\d{2}$/);
/** Delivery-by-distance rules for one state. The pin is private to Admin. */
const Region = (la: number, lb: number, ga: number, gb: number, msg: string) => z.object({
  hub: z.object({ lat: z.number().min(la).max(lb), lng: z.number().min(ga).max(gb) }, { error: msg }).nullable(),
  start: z.number().int().min(0).max(100000), perKm: z.number().int().min(0).max(10000), max: z.number().int().min(0).max(200000),
  range: z.number().int().min(1).max(600), days: S(40).min(2, 'Say how long delivery usually takes.'),
});
const Body = z.discriminatedUnion('key', [
  z.object({ key: z.literal('business'), value: z.object({ name: S(60).min(2), tagline: S(60), address: S(200).min(5), phone: S(20), whatsapp: z.string().regex(/^\d{10,15}$/, 'WhatsApp number: digits only, starting 234.'), email: z.string().trim().email(), tiktok: S(40) }) }),
  z.object({ key: z.literal('hours'), value: z.array(z.tuple([S(10), z.boolean(), Time, Time])).length(7) }),
  z.object({ key: z.literal('alerts'), value: z.object({ sound: z.boolean(), email: z.boolean(), emailTo: z.union([z.string().trim().email('Enter a valid email for alerts.'), z.literal('')]), whatsapp: z.boolean(), waTo: S(20), daily: z.boolean(), lowStock: z.boolean() }) }),
  z.object({ key: z.literal('policies'), value: z.object({ returns: S(1500), delivery: S(1500) }) }),
  z.object({ key: z.literal('lagos'), value: Region(6.3, 6.8, 2.7, 4.4, 'That pin isn’t in Lagos.') }),
  z.object({ key: z.literal('oyo'), value: Region(6.8, 9.3, 2.6, 4.7, 'That pin isn’t in Oyo State.') }),
  z.object({ key: z.literal('open_states'), value: z.array(z.string().regex(/^st:[A-Za-z .-]{2,30}$/)).max(40) }),
  z.object({ key: z.literal('slider'), value: z.object({ on: z.boolean(), seconds: z.number().int().min(3).max(15) }) }),
]);
/** Shop settings: business details, opening hours, alerts, policies and the home slider. */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'store');
  const b = Body.parse(await req.json());
  await setSetting(b.key, b.value);
  await logAct(me.name, `Updated ${({ business: 'business details', hours: 'opening hours', alerts: 'alert settings', policies: 'shop policies', slider: 'slider settings', open_states: 'which states we deliver to', oyo: 'Oyo delivery fees', lagos: 'Lagos delivery fees' } as Record<string, string>)[b.key]}`);
  refreshShop();
  return ok({ ok: true });
});
