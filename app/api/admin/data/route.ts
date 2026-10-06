import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireStaff, staffList, ROLE_LABEL } from '@/lib/staff';
import { DEFAULT_FEES } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

async function chats() {
  const list = must(await db().from('chats').select('id,customer_id,name,email,status,agent,created_at,updated_at')
    .or('status.in.(waiting,open),agent.not.is.null').order('updated_at', { ascending: false }).limit(60)) as { id: string }[];
  const ids = list.map(c => c.id);
  const msgs = ids.length ? must(await db().from('chat_messages').select('id,chat_id,who,text,created_at').in('chat_id', ids).order('id')) as { chat_id: string }[] : [];
  return list.map(c => ({ ...c, messages: msgs.filter(m => m.chat_id === c.id) }));
}

/** Everything the admin desk shows, in one call. ?part=chats returns only the chat queue (polled every few seconds). */
export const GET = handle(async (req: Request) => {
  const me = await requireStaff(req);
  const part = new URL(req.url).searchParams.get('part') || 'all';
  const seesOrders = me.role !== 'support'; // support staff handle chat and reviews only
  if (part === 'chats') return ok({ chats: await chats() });
  const [orders, products, promos, settings, zones, reviews, activity, customers, chatList, messages] = await Promise.all([
    db().from('orders').select('*').neq('status', 'pending').neq('status', 'expired').order('created_at', { ascending: false }).limit(500),
    db().from('products').select('*').order('sort'),
    db().from('promos').select('*').order('created_at', { ascending: false }),
    db().from('settings').select('key,value'),
    db().from('zones').select('*').order('sort'),
    db().from('reviews').select('id,product_id,order_id,name,stars,text,status,reply,created_at').order('created_at', { ascending: false }).limit(300),
    db().from('activity').select('staff_name,text,created_at').order('id', { ascending: false }).limit(150),
    db().from('customers').select('id,email,name,phone,promo_ok,created_at'),
    chats(),
    db().from('messages').select('id,order_id,kind,email_to,email_ok,data,created_at').not('order_id', 'is', null).order('created_at', { ascending: false }).limit(3000),
  ]);
  const set = Object.fromEntries((must(settings) as { key: string; value: unknown }[]).map(s => [s.key, s.value]));
  const cust = must(customers) as { phone: string | null }[];
  return ok({
    me: { name: me.name, email: me.email, role: ROLE_LABEL[me.role] },
    orders: seesOrders ? must(orders) : [], products: must(products), promos: must(promos), zones: must(zones), reviews: must(reviews), activity: must(activity),
    customers: !seesOrders ? [] : me.role === 'owner' ? cust : cust.map(c => ({ ...c, phone: c.phone ? c.phone.slice(0, 4) + '•••' + c.phone.slice(-4) : null })),
    chats: chatList, messages: seesOrders ? must(messages) : [],
    settings: { layout: set.layout || [], tiles: set.tiles || {}, aisles: set.aisles || {}, fees: set.fees || DEFAULT_FEES, store: set.store || {}, vouchers: set.vouchers || { TIADACARE: 500 } },
    staff: me.role === 'owner' ? (await staffList()).map(s => ({ ...s, role: ROLE_LABEL[s.role] })) : [],
    now: Date.now(),
  });
});
