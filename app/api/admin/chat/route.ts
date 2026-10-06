import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, logAct } from '@/lib/staff';

export const dynamic = 'force-dynamic';
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('join'), id: z.string().uuid() }),
  z.object({ action: z.literal('send'), id: z.string().uuid(), text: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal('end'), id: z.string().uuid() }),
]);
export const POST = handle(async (req: Request) => {
  const me = await requireStaff(req, 'chat');
  const b = Body.parse(await req.json());
  const first = me.name.split(' ')[0];
  const c = must(await db().from('chats').select('id,status,name,agent').eq('id', b.id).maybeSingle()) as { id: string; status: string; name: string; agent: string | null } | null;
  if (!c) return fail('Chat not found.', 404);
  if (c.status === 'closed') return fail('This chat has ended.', 409);
  const now = new Date().toISOString();
  if (b.action === 'join') {
    await db().from('chats').update({ status: 'open', agent: first, updated_at: now }).eq('id', c.id);
    await db().from('chat_messages').insert({ chat_id: c.id, who: 'sys', text: `${first} has joined the chat` });
    await logAct(me.name, `Joined live chat with ${c.name || 'a guest'}`);
  } else if (b.action === 'send') {
    if (c.status !== 'open') return fail('Join the chat first.');
    await db().from('chat_messages').insert({ chat_id: c.id, who: 'agent', text: b.text });
    await db().from('chats').update({ updated_at: now }).eq('id', c.id);
  } else {
    await db().from('chats').update({ status: 'closed', updated_at: now }).eq('id', c.id);
    await db().from('chat_messages').insert({ chat_id: c.id, who: 'sys', text: `${first} ended the chat` });
    await logAct(me.name, `Ended live chat with ${c.name || 'a guest'}`);
  }
  return ok({ ok: true });
});
