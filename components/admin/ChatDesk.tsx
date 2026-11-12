'use client';
import { useEffect, useRef, useState } from 'react';
import type { Ctx } from './Desk';
import type { Chat } from './types';
import { card, Btn, Empty, Pill, call, useToast, ago } from './ui';

export default function ChatDesk({ c }: { c: Ctx }) {
  const { d, hash, go, setD } = c;
  const toast = useToast();
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const openId = hash.startsWith('chat=') ? hash.slice(5) : '';
  const chats = [...d.chats].sort((a, b) => (a.status === 'waiting' ? -1 : 0) - (b.status === 'waiting' ? -1 : 0) || Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const cur = chats.find(x => x.id === openId) || null;
  // the chat queue refreshes every few seconds while this page is open
  useEffect(() => {
    const t = setInterval(async () => { try { const r = await call<{ chats: Chat[] }>('/api/admin/data?part=chats'); setD(x => (x ? { ...x, chats: r.chats } : x)); } catch { /* next tick */ } }, 5000);
    return () => clearInterval(t);
  }, [setD]);
  useEffect(() => { box.current?.scrollTo({ top: 1e6 }); }, [cur?.messages.length]);
  const [sending, setSending] = useState(false);
  const act = async (action: 'join' | 'send' | 'end', body: Record<string, unknown> = {}) => {
    if (!cur) return;
    if (action === 'send') setSending(true);
    try { await call('/api/admin/chat', { action, id: cur.id, ...body }); const r = await call<{ chats: Chat[] }>('/api/admin/data?part=chats'); setD(x => (x ? { ...x, chats: r.chats } : x)); if (action === 'send') setText(''); }
    catch (e) { toast('err', 'That didn’t work.', (e as Error).message); } finally { setSending(false); }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
      <section style={{ ...card, flex: '1 1 280px', maxWidth: '100%', overflow: 'hidden', alignSelf: 'flex-start' }}>
        {chats.map(ch => (
          <button key={ch.id} type="button" className="ub tdrow" onClick={() => go('chat', 'chat=' + ch.id)} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, padding: '14px 16px', borderBottom: '1px solid #F0ECE3', background: ch.id === openId ? '#FBF9F4' : undefined }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{ch.name || 'Guest'}</strong>{ch.status === 'waiting' ? <Pill bg="#F6E9CF" fg="#6B4A12">Waiting</Pill> : ch.status === 'open' ? <Pill bg="#E6EEE8" fg="#0B3A23">{ch.agent || 'Open'}</Pill> : <Pill>Ended</Pill>}</span>
            <span style={{ fontSize: 12.5, color: '#66736B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.messages.filter(m => m.who === 'me').slice(-1)[0]?.text || 'No messages yet'}</span>
            <span style={{ fontSize: 11.5, color: '#8B958E' }}>{ago(ch.updated_at)}</span>
          </button>
        ))}
        {!chats.length && <Empty title="No chats waiting." text="When a customer taps “Talk to a person”, they show up here and you get an email." />}
      </section>
      <section style={{ ...card, flex: '999 1 420px', minHeight: 460, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!cur ? <Empty title="Pick a chat." text="Choose one on the left to read and reply." /> : <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #ECE8DF' }}>
            <span style={{ flex: 1, minWidth: 0 }}><strong>{cur.name || 'Guest'}</strong>{cur.email && <span style={{ color: '#66736B', fontSize: 13 }}> · {cur.email}</span>}</span>
            {cur.status === 'waiting' || cur.status === 'bot' ? <Btn small onClick={() => act('join')}>Join chat</Btn> : cur.status === 'open' ? <Btn small kind="out" onClick={() => act('end')}>End chat</Btn> : null}
          </div>
          <div ref={box} className="thin" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, background: '#FBF9F4', maxHeight: '60vh' }}>
            {cur.messages.map(m => m.who === 'sys'
              ? <div key={m.id} style={{ alignSelf: 'center', fontSize: 12, color: '#66736B' }}>{m.text}</div>
              : <div key={m.id} style={{ alignSelf: m.who === 'me' ? 'flex-start' : 'flex-end', maxWidth: '78%', padding: '9px 13px', borderRadius: 14, background: m.who === 'me' ? '#FFFFFF' : m.who === 'bot' ? '#EFEDE6' : '#0B3A23', color: m.who === 'agent' ? '#FFFFFF' : '#1F2A23', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', border: m.who === 'me' ? '1px solid #ECE8DF' : 0 }}>{m.who === 'bot' && <span style={{ display: 'block', fontSize: 11, color: '#66736B' }}>Assistant</span>}{m.text}</div>)}
          </div>
          {cur.status === 'open' && (
            <form onSubmit={e => { e.preventDefault(); if (text.trim()) act('send', { text: text.trim() }); }} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #ECE8DF' }}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a reply…" aria-label="Reply" maxLength={1000} style={{ flex: 1, height: 44, padding: '0 14px', borderRadius: 999, border: '1px solid #DCD6CA', fontSize: 14 }} />
              <Btn type="submit" disabled={!text.trim() || sending}>{sending ? 'Sending…' : 'Send'}</Btn>
            </form>
          )}
        </>}
      </section>
    </div>
  );
}
