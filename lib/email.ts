import { env } from './env';

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Branded email wrapper. Inline styles only, so it looks right in Gmail and phone mail apps. */
export function layout(o: { heading: string; bodyHtml: string; cta?: { label: string; url: string } ; preheader?: string }) {
  const site = env.siteUrl;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.heading)}</title></head>
<body style="margin:0;background:#F3EFE6;font-family:Montserrat,Segoe UI,Helvetica,Arial,sans-serif;color:#26332B">
<span style="display:none!important;opacity:0;color:transparent;max-height:0;overflow:hidden">${esc(o.preheader || o.heading)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EFE6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0B3A23;padding:22px 16px;text-align:center">
  <img src="${site}/logo-icon.png" width="44" height="57" alt="" style="display:block;margin:0 auto 8px;background:#FBF9F4;border-radius:10px;padding:4px">
  <div style="color:#ffffff;font-weight:800;letter-spacing:3px;font-size:18px">TIADA MARKETPLACE</div></td></tr>
<tr><td style="background:#FBF9F4;text-align:center;padding:8px;font-family:Georgia,serif;font-style:italic;font-weight:700;color:#B5832E">Foodstuffs and cereals</td></tr>
<tr><td style="padding:24px 26px;font-size:15px;line-height:1.6">
  <h1 style="margin:0 0 12px;font-size:20px;color:#0B3A23">${esc(o.heading)}</h1>
  ${o.bodyHtml}
  ${o.cta ? `<p style="text-align:center;margin:22px 0 6px"><a href="${esc(o.cta.url)}" style="display:inline-block;background:#0B3A23;color:#ffffff;text-decoration:none;font-weight:800;border:2px solid #D49B41;border-radius:999px;padding:12px 24px">${esc(o.cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="border-top:2px solid #D49B41;padding:16px;text-align:center;font-size:12px;color:#6B7A70;line-height:1.7">
  Tiada Marketplace · Ojota Logistics Hub, Ikorodu Road, Lagos, Nigeria<br>
  WhatsApp 08075110000 · care@tiadamarketplace.com<br>
  <a href="${site}/#account" style="color:#6B7A70">Manage email preferences</a>
</td></tr></table></td></tr></table></body></html>`;
}

export function itemsTable(lines: { name: string; size: string; qty: number; price: number; swaps?: { from: string; to: string }[] }[], total: number, extra?: [string, number][]) {
  const row = (l: string, r: string, bold = false) => `<tr><td style="padding:7px 0;border-bottom:1px solid #EEE9DE;${bold ? 'font-weight:800' : ''}">${l}</td><td style="padding:7px 0;border-bottom:1px solid #EEE9DE;text-align:right;${bold ? 'font-weight:800' : 'font-weight:600'}">${r}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0 14px">
  ${lines.map(l => row(`${esc(l.name)}${l.size !== 'Package' ? ' ' + esc(l.size) : ''} × ${l.qty}${l.swaps?.length ? `<br><span style="color:#8A5F1C;font-size:12px">${l.swaps.map(w => `${esc(w.from)} → ${esc(w.to)}`).join(', ')}</span>` : ''}`, naira(l.price * l.qty))).join('')}
  ${(extra || []).map(([k, v]) => row(esc(k), (v < 0 ? '−' : '') + naira(Math.abs(v)))).join('')}
  ${row('Total paid', naira(total), true)}</table>`;
}

/** Send through Resend. Returns the email id, or null if email isn't set up yet. */
export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ id: string | null; ok: boolean; error?: string }> {
  if (!env.resendKey) return { id: null, ok: false, error: 'RESEND_API_KEY not set' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom, to: [to], subject, html, text: text || subject }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { id: null, ok: false, error: j.message || String(r.status) };
    return { id: j.id || null, ok: true };
  } catch (e) { return { id: null, ok: false, error: (e as Error).message }; }
}

/** Up to 100 emails per call. */
export async function sendBatch(msgs: { to: string; subject: string; html: string }[]) {
  if (!env.resendKey) return { sent: 0 };
  let sent = 0;
  for (let i = 0; i < msgs.length; i += 100) {
    const chunk = msgs.slice(i, i + 100).map(m => ({ from: env.emailFrom, to: [m.to], subject: m.subject, html: m.html }));
    const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(chunk) });
    if (r.ok) sent += chunk.length;
  }
  return { sent };
}
export { naira };
