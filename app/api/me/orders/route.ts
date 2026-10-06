import { handle, ok } from '@/lib/http';
import { db, must } from '@/lib/db';
import { requireCustomer } from '@/lib/customer';
import { publicOrder } from '@/lib/orders';
import type { Order } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const GET = handle(async () => {
  const c = await requireCustomer();
  const rows = must(await db().from('orders').select('*').eq('customer_id', c.id).not('status', 'in', '(pending,expired)').order('created_at', { ascending: false }).limit(50)) as Order[];
  const emails = must(await db().from('messages').select('order_id,kind,title,created_at,email_ok').eq('customer_id', c.id).not('order_id', 'is', null).order('created_at'));
  return ok({ orders: rows.map(publicOrder), emails });
});
