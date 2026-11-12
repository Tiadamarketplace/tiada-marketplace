import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, fail, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { currentCustomer } from '@/lib/customer';
import { ownerChat } from '@/lib/notify';
import { botReply } from '@/lib/bot';

export const dynamic = 'force-dynamic';
type Chat = { id: string; token: string; status: string; agent: string | null; name: string | null; updated_at: string };
/** A chat with no messages for this long is closed; the customer starts a fresh one. */
export const CHAT_IDLE_MS = 60 * 60000;
async function load(id: string, token: string) {
  const c = (await db().from('chats').select('id,token,status,agent,name,updated_at').eq('id', id).maybeSingle()).data as Chat | null;
  if (!c || !token || c.token !== token) return null;
  if (c.status !== 'closed' && Date.now() - new Date(c.updated_at).getTime() > CHAT_IDLE_MS) {
    await db().from('chats').update({ status: 'closed' }).eq('id', c.id);
    await db().from('chat_messages').insert({ chat_id: c.id, who: 'sys', text: 'This chat closed after a while with no messages.' });
    c.status = 'closed';
  }
  return c;
}
const touch = (id: string, extra: Record<string, unknown> = {}) => db().from('chats').update({ updated_at: new Date().toISOString(), ...extra }).eq('id', id);
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
  z.object({ action: z.literal('ask'), id: z.string().uuid(), token: z.string(), text: z.string().trim().min(1).max(1500) }),
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
  if (b.action === 'ask') {
    if (c.status === 'closed') return fail('This chat has ended. Start a new one.', 409);
    limit('ask:' + c.id, 30, 10 * 60000);
    const history = (must(await db().from('chat_messages').select('who,text').eq('chat_id', c.id).order('id', { ascending: false }).limit(16)) as { who: string; text: string }[]).reverse();
    must(await db().from('chat_messages').insert({ chat_id: c.id, who: 'me', text: b.text }));
    if (c.status !== 'bot') { await touch(c.id); return ok({ status: c.status }); }
    const a = await botReply(history, b.text);
    must(await db().from('chat_messages').insert({ chat_id: c.id, who: 'bot', text: a.text }));
    if (a.handoff) {
      await touch(c.id, { status: 'waiting' });
      await ownerChat({ id: c.id, name: c.name, text: b.text }).catch(e => console.error('chat email', e));
      return ok({ status: 'waiting' });
    }
    await touch(c.id);
    return ok({ status: 'bot' });
  }
  if (b.action === 'send') {
    if (c.status === 'closed') return fail('This chat has ended. Start a new one.', 409);
    const m = must(await db().from('chat_messages').insert({ chat_id: c.id, who: b.who, text: b.text }).select('id').single());
    await touch(c.id);
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
