import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';
import { newToken } from '@/lib/riders';

export const dynamic = 'force-dynamic';
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), name: z.string().trim().min(2, 'Add the rider’s name.').max(60), phone: z.string().trim().max(20).optional() }),
  z.object({ action: z.literal('active'), id: z.string().uuid(), active: z.boolean() }),
  z.object({ action: z.literal('newlink'), id: z.string().uuid() }),
  z.object({ action: z.literal('edit'), id: z.string().uuid(), name: z.string().trim().min(2).max(60), phone: z.string().trim().max(20).optional() }),
]);

/** Add riders, switch them off, or give them a new private link (the old one stops working). */
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'orders');
  const b = Body.parse(await req.json());
  const phone = (p?: string) => (p || '').replace(/[^\d+]/g, '') || null;
  switch (b.action) {
    case 'add': {
      const r = await db().from('riders').insert({ name: b.name, phone: phone(b.phone), token: newToken() }).select('*').single();
      if (r.error && /riders/.test(r.error.message)) return fail('Run the 2026-11-riders.sql update in Supabase first, then try again.');
      await logAct(me.name, `Added rider ${b.name}`);
      return ok({ rider: must(r) });
    }
    case 'active':
      must(await db().from('riders').update({ active: b.active }).eq('id', b.id));
      await logAct(me.name, `${b.active ? 'Switched on' : 'Switched off'} a rider`);
      return ok({});
    case 'newlink': {
      const r = must(await db().from('riders').update({ token: newToken() }).eq('id', b.id).select('*').single());
      await logAct(me.name, 'Made a new rider link');
      return ok({ rider: r });
    }
    case 'edit':
      must(await db().from('riders').update({ name: b.name, phone: phone(b.phone) }).eq('id', b.id));
      return ok({});
  }
});
