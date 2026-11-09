'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import type { Review } from './types';
import { card, Btn, Tabs, Empty, Pill, call, useToast, ago } from './ui';

export default function Reviews({ c }: { c: Ctx }) {
  const { d, reload } = c;
  const toast = useToast();
  const [tab, setTab] = useState<'pending' | 'live' | 'hidden'>('pending');
  const [reply, setReply] = useState<Record<string, string>>({});
  const list = d.reviews.filter(r => r.status === tab);
  const name = (pid: string) => d.products.find(p => p.id === pid)?.name || pid;
  const act = async (r: Review, body: Record<string, unknown>, msg: string) => { try { await call('/api/admin/reviews', { id: r.id, ...body }); await reload(); toast('ok', msg); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs value={tab} onChange={setTab} tabs={[['pending', 'To check', d.reviews.filter(r => r.status === 'pending').length], ['live', 'Showing'], ['hidden', 'Hidden']]} />
      <section style={{ ...card, overflow: 'hidden' }}>
        {list.map(r => (
          <article key={r.id} style={{ padding: '18px 20px', borderBottom: '1px solid #F0ECE3', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#D49B41', letterSpacing: 2, fontSize: 16 }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
              <strong>{r.name}</strong><span style={{ color: '#66736B', fontSize: 13 }}>on {name(r.product_id)} · {ago(r.created_at)} · order {r.order_id}</span>
              {r.stars <= 2 && <Pill bg="#FBEFEB" fg="#7A2A1B">Unhappy</Pill>}
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65 }}>{r.text}</p>
            {r.reply && <p style={{ margin: 0, padding: '8px 12px', borderLeft: '3px solid #D49B41', background: '#FBF9F4', fontSize: 13.5 }}><strong>Your reply:</strong> {r.reply}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {r.status !== 'live' && <Btn small onClick={() => act(r, { status: 'live' }, 'Review is showing in the shop.')}>Approve</Btn>}
              {r.status !== 'hidden' && <Btn small kind="out" onClick={() => act(r, { status: 'hidden' }, 'Review hidden.')}>Hide</Btn>}
              <input value={reply[r.id] ?? ''} onChange={e => setReply(x => ({ ...x, [r.id]: e.target.value }))} placeholder={r.reply ? 'Change your reply' : 'Reply publicly (optional)'} maxLength={400} style={{ flex: '1 1 220px', height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #DCD6CA', fontSize: 13 }} />
              {(reply[r.id] || '').trim() && <Btn small kind="soft" onClick={() => { act(r, { reply: reply[r.id] }, 'Reply saved.'); setReply(x => ({ ...x, [r.id]: '' })); }}>Save reply</Btn>}
            </div>
          </article>
        ))}
        {!list.length && <Empty title={tab === 'pending' ? 'No reviews to check.' : 'Nothing here.'} text={tab === 'pending' ? 'Customers can review once their order is delivered. The delivered email asks them.' : undefined} />}
      </section>
    </div>
  );
}
