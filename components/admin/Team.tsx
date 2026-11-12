'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import { Section, Btn, Switch, Pill, Confirm, call, useToast, input, lab, ago } from './ui';

export default function Team({ c }: { c: Ctx }) {
  const { d, reload } = c;
  const toast = useToast();
  const owner = d.me.role === 'Owner';
  const [add, setAdd] = useState({ name: '', email: '', role: 'staff' });
  const [cred, setCred] = useState<{ who: string; password: string; qr: string; secret: string } | null>(null);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [ask, setAsk] = useState<{ id: string; name: string } | null>(null);
  const [mfa, setMfa] = useState<{ pw: string; code: string; ticket?: string; qr?: string; secret?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast('err', 'That didn’t work.', (e as Error).message); } finally { setBusy(false); } };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: 18, alignItems: 'start' }}>
      {owner && (
        <Section title="People who can open the desk" sub="Staff can pack orders and edit products. Support can answer chat and reviews. Only owners see money settings.">
          {d.staff.map(s => (
            <div key={s.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #F0ECE3' }}>
              <span style={{ flex: 1, minWidth: 160 }}><strong>{s.name}</strong><span style={{ display: 'block', fontSize: 12.5, color: '#66736B' }}>{s.email}</span></span>
              <Pill bg={s.role === 'Owner' ? '#0B3A23' : '#F2EFE8'} fg={s.role === 'Owner' ? '#FFFFFF' : '#4D5A52'}>{s.role}</Pill>
              {s.email !== d.me.email && <>
                <Btn small kind="out" onClick={() => setAsk({ id: s.id, name: s.name })}>Reset access</Btn>
                <Switch on={s.active} label={`${s.name} can sign in`} onChange={v => run(async () => { await call('/api/admin/staff', { action: 'active', id: s.id, active: v }); await reload(); toast('ok', v ? `${s.name} can sign in.` : `${s.name} is switched off.`); })} />
              </>}
            </div>
          ))}
          <form onSubmit={e => { e.preventDefault(); run(async () => { const r = await call<{ password: string; qr: string; secret: string }>('/api/admin/staff', { action: 'add', ...add }); setCred({ who: add.name, ...r }); setAdd({ name: '', email: '', role: 'staff' }); await reload(); }); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #ECE8DF' }}>
            <label style={lab}>Name<input value={add.name} onChange={e => setAdd(x => ({ ...x, name: e.target.value }))} style={input} /></label>
            <label style={lab}>Email<input type="email" value={add.email} onChange={e => setAdd(x => ({ ...x, email: e.target.value }))} style={input} /></label>
            <label style={lab}>Role<select value={add.role} onChange={e => setAdd(x => ({ ...x, role: e.target.value }))} style={input}><option value="staff">Staff</option><option value="support">Support</option><option value="owner">Owner</option></select></label>
            <Btn type="submit" disabled={busy || !add.name || !add.email} style={{ alignSelf: 'end' }}>Add person</Btn>
          </form>
        </Section>
      )}
      {cred && (
        <Section title={`Sign-in details for ${cred.who}`} sub="Show these to them once. They won’t be shown again.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <img src={cred.qr} alt="Authenticator QR code" width={170} height={170} />
            <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
              <div>Temporary password: <strong style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{cred.password}</strong></div>
              <div>Authenticator key: <strong style={{ fontFamily: 'ui-monospace, Menlo, monospace', wordBreak: 'break-all' }}>{cred.secret}</strong></div>
              <div style={{ color: '#66736B' }}>They scan the code with Google Authenticator, then sign in and change the password under Team & security.</div>
              <Btn small kind="out" onClick={() => setCred(null)} style={{ marginTop: 8 }}>Done, hide this</Btn>
            </div>
          </div>
        </Section>
      )}
      <Section title="Your password">
        <form onSubmit={e => { e.preventDefault(); run(async () => { await call('/api/admin/staff', { action: 'password', ...pw }); setPw({ current: '', next: '' }); toast('ok', 'Password changed.'); }); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <label style={lab}>Current password<input type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw(x => ({ ...x, current: e.target.value }))} style={input} /></label>
          <label style={lab}>New password (10+ characters)<input type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw(x => ({ ...x, next: e.target.value }))} style={input} /></label>
          <Btn type="submit" disabled={busy || !pw.current || pw.next.length < 10} style={{ alignSelf: 'end' }}>Change password</Btn>
        </form>
        <p style={{ margin: '12px 0 0', fontSize: 12.5, color: '#66736B' }}>The desk locks itself after 15 minutes without use.</p>
      </Section>
      <Section title="Your authenticator" sub="The app on your phone that gives you the 6-digit sign-in code. Change it when you get a new phone, or to add Tiada to another phone.">
        {!mfa && <Btn kind="out" onClick={() => setMfa({ pw: '', code: '' })}>Change authenticator QR code</Btn>}
        {mfa && !mfa.ticket && (
          <form onSubmit={e => { e.preventDefault(); run(async () => { const r = await call<{ ticket: string; qr: string; secret: string }>('/api/admin/staff', { action: 'totp_start', current: mfa.pw }); setMfa({ pw: '', code: '', ...r }); }); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <label style={lab}>Your password, to check it’s you<input type="password" autoComplete="current-password" value={mfa.pw} onChange={e => setMfa(x => x && ({ ...x, pw: e.target.value }))} style={input} autoFocus /></label>
            <span style={{ display: 'flex', gap: 8, alignSelf: 'end' }}><Btn type="submit" disabled={busy || !mfa.pw}>{busy ? 'Checking…' : 'Show new QR code'}</Btn><Btn kind="text" onClick={() => setMfa(null)}>Cancel</Btn></span>
          </form>
        )}
        {mfa?.ticket && (
          <form onSubmit={e => { e.preventDefault(); run(async () => { await call('/api/admin/staff', { action: 'totp_confirm', ticket: mfa.ticket, code: mfa.code }); setMfa(null); toast('ok', 'Authenticator changed.', 'Use the new code from now on. The old one no longer works.'); await reload(); }); }} style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <img src={mfa.qr} alt="New authenticator QR code" width={180} height={180} style={{ borderRadius: 8 }} />
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, lineHeight: 1.6 }}>
              <span>1. Open Google Authenticator or Microsoft Authenticator, tap <strong>+</strong> and scan this code.</span>
              <span style={{ color: '#66736B', wordBreak: 'break-all' }}>Can’t scan? Type this key: <strong style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: '#1F2A23' }}>{mfa.secret}</strong></span>
              <label style={lab}>2. Type the 6-digit code it shows<input inputMode="numeric" autoComplete="one-time-code" value={mfa.code} onChange={e => setMfa(x => x && ({ ...x, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))} style={{ ...input, letterSpacing: '0.2em', maxWidth: 200 }} autoFocus /></label>
              <span style={{ display: 'flex', gap: 8 }}><Btn type="submit" disabled={busy || mfa.code.length !== 6}>{busy ? 'Saving…' : 'Save new authenticator'}</Btn><Btn kind="text" onClick={() => setMfa(null)}>Cancel</Btn></span>
              <span style={{ fontSize: 12.5, color: '#66736B' }}>Your old code keeps working until you press Save.</span>
            </div>
          </form>
        )}
      </Section>
      <Section title="Recent activity" sub="Everything done in the desk, newest first.">
        <div className="thin" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {d.activity.map((a, i) => <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid #F5F2EB', fontSize: 13 }}><span style={{ flex: 1 }}><strong style={{ fontWeight: 600 }}>{a.staff_name}</strong> {a.text}</span><span style={{ color: '#8B958E', whiteSpace: 'nowrap' }}>{ago(a.created_at)}</span></div>)}
        </div>
      </Section>
      {ask && <Confirm title={`Reset ${ask.name}’s access?`} text="Their old password and authenticator stop working. You’ll get new sign-in details to give them." yes="Reset" danger onNo={() => setAsk(null)} onYes={() => { const a = ask; setAsk(null); run(async () => { const r = await call<{ password: string; qr: string; secret: string }>('/api/admin/staff', { action: 'reset', id: a.id }); setCred({ who: a.name, ...r }); await reload(); }); }} />}
    </div>
  );
}
