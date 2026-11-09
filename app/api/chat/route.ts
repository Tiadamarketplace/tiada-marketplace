import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { currentCustomer } from '@/lib/customer';
import { ownerChat } from '@/lib/notify';
import { esc } from '@/lib/email';

export const dynamic = 'force-dynamic';
type Chat = { id: string; token: string; status: string; agent: string | null; name: string | null };
async function load(id: string, token: string) {
  const c = (await db().from('chats').select('id,token,status,agent,name').eq('id', id).maybeSingle()).data as Chat | null;
  if (!c || !token || c.token !== token) return null;
  return c;
}
/** Poll for new messages. */
export const GET = handle(async (req: Request) => {
  const u = new URL(req.url), id = u.searchParams.get('id') || '', token = u.searchParams.get('token') || '', after = +(u.searchParams.get('after') || 0);
  const c = await load(id, token);
  if (!c) return fail('Chat not found.', 404);
  const msgs = must(await db().from('chat_messages').select('id,who,text,created_at').eq('chat_id', id).gt('id', after).order('id').limit(100));
  return ok({ status: c.status, agent: c.agent, messages: msgs });
});
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('send'), id: z.string().uuid(), token: z.string(), who: z.enum(['me', 'bot']), text: z.string().trim().min(1).max(1500) }),
  z.object({ action: z.literal('escalate'), id: z.string().uuid(), token: z.string() }),
  z.object({ action: z.literal('end'), id: z.string().uuid(), token: z.string() }),
]);
export const POST = handle(async (req: Request) => {
  limit('chat:' + clientIp(req), 120, 10 * 60000);
  const b = Body.parse(await req.json());
  if (b.action === 'start') {
    const cust = await currentCustomer();
    const token = crypto.randomBytes(18).toString('hex');
    const c = must(await db().from('chats').insert({ customer_id: cust?.id || null, name: cust?.name || 'Guest', email: cust?.email || null, token }).select('id').single()) as { id: string };
    return ok({ id: c.id, token });
  }
  const c = await load(b.id, b.token);
  if (!c) return fail('Chat not found.', 404);
  if (b.action === 'send') {
    if (c.status === 'closed') return fail('This chat has ended. Start a new one.', 409);
    const m = must(await db().from('chat_messages').insert({ chat_id: c.id, who: b.who, text: b.text }).select('id').single());
    await db().from('chats').update({ updated_at: new Date().toISOString() }).eq('id', c.id);
    return ok(m);
  }
  if (b.action === 'escalate') {
    if (c.status === 'bot') {
      await db().from('chats').update({ status: 'waiting', updated_at: new Date().toISOString() }).eq('id', c.id);
      const last = (await db().from('chat_messages').select('text').eq('chat_id', c.id).eq('who', 'me').order('id', { ascending: false }).limit(1)).data as { text: string }[] | null;
      await ownerChat({ id: c.id, name: c.name, text: last?.[0]?.text }).catch(e => console.error('chat email', e));
    }
    return ok({ status: 'waiting' });
  }
  await db().from('chats').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', c.id);
  await db().from('chat_messages').insert({ chat_id: c.id, who: 'sys', text: 'You ended the chat.' });
  return ok({ status: 'closed' });
});
