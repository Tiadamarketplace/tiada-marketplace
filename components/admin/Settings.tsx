'use client';
import { useState } from 'react';
import type { Ctx } from './Desk';
import type { Alerts, Business } from './types';
import { Section, Btn, Switch, Pill, call, useToast, input, lab, chime } from './ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export default function Settings({ c }: { c: Ctx }) {
  const { d, reload } = c;
  const toast = useToast();
  const owner = d.me.role === 'Owner';
  const [biz, setBiz] = useState<Business>({ name: 'Tiada Marketplace', tagline: 'Your trusted plug', address: '', phone: '', whatsapp: '', email: '', tiktok: '', ...d.settings.business });
  const [hours, setHours] = useState<[string, boolean, string, string][]>(d.settings.hours?.length === 7 ? d.settings.hours : DAYS.map(x => [x, x !== 'Sunday', '08:00', '18:00']));
  const [al, setAl] = useState<Alerts>({ sound: true, email: true, emailTo: '', whatsapp: false, waTo: '', daily: true, lowStock: true, ...d.settings.alerts });
  const [pol, setPol] = useState({ returns: '', delivery: '', ...d.settings.policies });
  const [slider, setSlider] = useState({ on: true, seconds: 6, ...d.settings.slider });
  const [busy, setBusy] = useState('');
  const save = async (key: string, value: unknown, msg: string) => { setBusy(key); try { await call('/api/admin/settings', { key, value }); await reload(); toast('ok', msg); } catch (e) { toast('err', 'That didn’t save.', (e as Error).message); } finally { setBusy(''); } };
  const B = (k: keyof Business, l: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => <label style={lab}>{l}<input value={biz[k] || ''} onChange={e => setBiz(x => ({ ...x, [k]: e.target.value }))} disabled={!owner} style={input} {...extra} /></label>;
  const row = (l: string, s: string, on: boolean, fn: (v: boolean) => void) => <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid #F0ECE3' }}><span style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12.5, color: '#66736B' }}>{s}</span></span><Switch on={on} label={l} onChange={fn} /></div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: 18, alignItems: 'start' }}>
      {!owner && <p style={{ gridColumn: '1 / -1', margin: 0, padding: '10px 14px', borderRadius: 10, background: '#FBF2DE', color: '#5C430F', fontSize: 13.5 }}>Only the owner can change shop settings.</p>}
      <Section title="Business details" sub="Shown in the shop footer, on the Help page and in emails.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {B('name', 'Shop name')}{B('tagline', 'Tagline')}
          <div style={{ gridColumn: '1 / -1' }}>{B('address', 'Address')}</div>
          {B('phone', 'Phone (as people see it)', { placeholder: '0807 511 0000' })}{B('whatsapp', 'WhatsApp number (digits, starting 234)', { placeholder: '2348075110000', inputMode: 'numeric' })}
          {B('email', 'Email for customers', { type: 'email' })}{B('tiktok', 'TikTok username', { placeholder: 'tiadamarketplace' })}
        </div>
        {owner && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><Btn disabled={busy === 'business'} onClick={() => save('business', biz, 'Business details saved.')}>Save details</Btn></div>}
      </Section>

      <Section title="Paystack" sub="How customers pay.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 10px' }}>
          {d.testMode ? <Pill bg="#F6E9CF" fg="#6B4A12">Test mode</Pill> : <Pill bg="#E6EEE8" fg="#0B3A23">Live</Pill>}
          <span style={{ fontSize: 13.5, color: '#4D5A52' }}>{d.testMode ? 'Customers can’t pay real money yet.' : 'Taking real payments by card, bank transfer and USSD.'}</span>
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: '#4D5A52' }}>
          <li>Your Paystack secret key lives in Vercel as PAYSTACK_SECRET_KEY. Never paste it anywhere else.</li>
          <li>In Paystack, under Settings › Preferences, make sure Card, Bank Transfer and USSD are switched on.</li>
          <li>In Paystack, under Settings › API Keys & Webhooks, the webhook URL should be your site address followed by /api/paystack/webhook.</li>
        </ol>
      </Section>

      <Section title="Alerts" sub="How the desk tells you something needs you.">
        {row('Chime for new orders', 'Plays while this desk is open', al.sound, v => setAl(x => ({ ...x, sound: v })))}
        {al.sound && <Btn kind="text" small onClick={chime}>Play the chime</Btn>}
        {row('Email me', 'New orders, chats, reviews and website messages', al.email, v => setAl(x => ({ ...x, email: v })))}
        {al.email && <label style={{ ...lab, marginBottom: 6 }}>Send alerts to<input type="email" value={al.emailTo} onChange={e => setAl(x => ({ ...x, emailTo: e.target.value }))} placeholder={biz.email || 'you@example.com'} style={input} disabled={!owner} /></label>}
        {row('Evening summary', 'One email at 8pm with the day’s sales', al.daily, v => setAl(x => ({ ...x, daily: v })))}
        {row('Running low', 'Included in the evening email when sizes run low', al.lowStock, v => setAl(x => ({ ...x, lowStock: v })))}
        {owner && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}><Btn disabled={busy === 'alerts'} onClick={() => save('alerts', al, 'Alert settings saved.')}>Save alerts</Btn></div>}
      </Section>

      <Section title="Opening hours" sub="Shown on the Help page so people know when you’ll reply.">
        {hours.map((h, i) => (
          <div key={h[0]} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid #F0ECE3' : 0 }}>
            <span style={{ width: 100, fontWeight: 600 }}>{h[0]}</span>
            <Switch on={h[1]} label={`Open on ${h[0]}`} onChange={v => setHours(x => x.map((y, j) => (j === i ? [y[0], v, y[2], y[3]] : y)))} />
            {h[1] ? <><input type="time" value={h[2]} onChange={e => setHours(x => x.map((y, j) => (j === i ? [y[0], y[1], e.target.value, y[3]] : y)))} style={{ ...input, width: 120, height: 38 }} aria-label={`${h[0]} opens`} /><span>to</span><input type="time" value={h[3]} onChange={e => setHours(x => x.map((y, j) => (j === i ? [y[0], y[1], y[2], e.target.value] : y)))} style={{ ...input, width: 120, height: 38 }} aria-label={`${h[0]} closes`} /></> : <span style={{ color: '#66736B' }}>Closed</span>}
          </div>
        ))}
        {owner && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}><Btn disabled={busy === 'hours'} onClick={() => save('hours', hours, 'Opening hours saved.')}>Save hours</Btn></div>}
      </Section>

      <Section title="Policies" sub="Shown on product pages, the Help page and Terms of sale.">
        <label style={lab}>Returns and problems<textarea rows={4} value={pol.returns} onChange={e => setPol(x => ({ ...x, returns: e.target.value }))} disabled={!owner} /></label>
        <label style={{ ...lab, marginTop: 12 }}>Delivery<textarea rows={4} value={pol.delivery} onChange={e => setPol(x => ({ ...x, delivery: e.target.value }))} disabled={!owner} /></label>
        {owner && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><Btn disabled={busy === 'policies'} onClick={() => save('policies', pol, 'Policies saved.')}>Save policies</Btn></div>}
      </Section>

      <Section title="Home page slider">
        {row('Show the slider', 'The banners in the middle of the home page', slider.on, v => setSlider(x => ({ ...x, on: v })))}
        <label style={{ ...lab, marginTop: 8 }}>Seconds on each slide · {slider.seconds}<input type="range" min={3} max={15} value={slider.seconds} onChange={e => setSlider(x => ({ ...x, seconds: Number(e.target.value) }))} /></label>
        {owner && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><Btn disabled={busy === 'slider'} onClick={() => save('slider', slider, 'Slider settings saved.')}>Save</Btn></div>}
      </Section>
    </div>
  );
}
