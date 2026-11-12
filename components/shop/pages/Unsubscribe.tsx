'use client';
import Link from '@/components/shop/Link';
import { useState } from 'react';
import { api } from '@/lib/shop-client';
import { btnSolid, Spin } from '../ui';

export default function Unsubscribe({ email, token }: { email: string; token: string }) {
  const [st, setSt] = useState<'ask' | 'busy' | 'done' | 'err'>('ask');
  const [msg, setMsg] = useState('');
  const go = async () => {
    setSt('busy');
    try { await api(`/api/subscribe?email=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`, { method: 'DELETE' }); setSt('done'); }
    catch (e) { setMsg((e as Error).message); setSt('err'); }
  };
  return (
    <div className="fade" style={{ maxWidth: 520, margin: '0 auto', padding: '72px clamp(16px, 3vw, 28px) 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {st === 'done' ? <>
        <h1 style={{ margin: 0, fontWeight: 500, fontSize: 28 }}>You’re unsubscribed</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#3C4741' }}>We won’t send deals emails to {email} any more. You’ll still get emails about orders you place.</p>
        <Link href="/" className="lnk" style={{ fontSize: 14.5, color: '#0B3A23' }}>Back to the shop</Link>
      </> : <>
        <h1 style={{ margin: 0, fontWeight: 500, fontSize: 28 }}>Stop deals emails?</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#3C4741' }}>{email ? <>We’ll stop sending new stock and combo deals to <strong>{email}</strong>.</> : 'This link is incomplete. Use the link at the bottom of one of our emails.'}</p>
        {st === 'err' && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#9E3522' }}>{msg}</p>}
        {email && <button type="button" disabled={st === 'busy'} className="ub btn-solid press" onClick={go} style={btnSolid}>{st === 'busy' ? <><Spin />One moment…</> : 'Unsubscribe'}</button>}
      </>}
    </div>
  );
}
