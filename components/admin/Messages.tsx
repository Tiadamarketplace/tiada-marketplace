'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import { card, Btn, Tabs, Empty, call, useToast, ago } from './ui';

export default function Messages({ c }: { c: Ctx }) {
  const { d, reload } = c;
  const toast = useToast();
  const [tab, setTab] = useState<'new' | 'done'>('new');
  const list = d.contact.filter(m => (tab === 'new' ? !m.handled : m.handled));
  const mark = async (id: string, handled: boolean) => { try { await call('/api/admin/messages', { id, handled }); await reload(); toast('ok', handled ? 'Marked as handled.' : 'Moved back to new.'); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs value={tab} onChange={setTab} tabs={[['new', 'New', d.contact.filter(m => !m.handled).length], ['done', 'Handled']]} />
      <section style={{ ...card, overflow: 'hidden' }}>
        {list.map(m => (
          <article key={m.id} style={{ padding: '18px 20px', borderBottom: '1px solid #F0ECE3', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}><strong>{m.name}</strong><span style={{ fontSize: 13, color: '#66736B' }}>{m.email}{m.phone ? ` · ${m.phone}` : ''} · {ago(m.created_at)}</span></div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{m.text}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Tiada')}`} className="ub btn-solid press" style={{ height: 36, padding: '0 14px', borderRadius: 9, background: '#0B3A23', color: '#FFFFFF', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Reply by email</a>
              {m.phone && <a href={`https://wa.me/234${m.phone.replace(/\D/g, '').replace(/^0/, '').replace(/^234/, '')}`} target="_blank" rel="noopener" className="ub qbtn" style={{ height: 36, padding: '0 14px', borderRadius: 9, border: '1px solid #DCD6CA', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: '#1F2A23' }}>WhatsApp</a>}
              <Btn small kind="soft" onClick={() => mark(m.id, !m.handled)}>{m.handled ? 'Move back to new' : 'Mark handled'}</Btn>
            </div>
          </article>
        ))}
        {!list.length && <Empty title={tab === 'new' ? 'No new messages.' : 'Nothing here yet.'} />}
      </section>
    </div>
  );
}
