import { env } from './env';

const naira = (n: number) => '₦' + Math.round(n || 0).toLocaleString('en-NG');
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/* ------------------------------------------------------------------------------------------------
 * One email style for everything the shop sends.
 * Built from tables with inline styles so it holds up in Gmail, Outlook and phone mail apps:
 * one 600px column, Montserrat with Arial fallback, Playfair italic with Georgia fallback.
 * ---------------------------------------------------------------------------------------------- */

const SANS = "Montserrat,Arial,Helvetica,sans-serif";
const SERIF = "'Playfair Display',Georgia,'Times New Roman',serif";
const row = (inner: string, pad = '24px 36px 0', extra = '') => `<tr><td class="px" style="padding:${pad};${extra}">${inner}</td></tr>`;
const label = (s: string) => `<div style="font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#66736B">${s}</div>`;

export type Block =
  | { kind: 'text'; html: string }
  | { kind: 'button'; label: string; url: string; sub?: string }
  | { kind: 'buttons'; label: string; url: string; alt: string; altUrl: string; altColor?: string; sub?: string }
  | { kind: 'boxes'; boxes: [string, string][] }
  | { kind: 'items'; title: string; rows: { name: string; meta: string; price: string; swap?: string; img?: string | null }[] }
  | { kind: 'totals'; rows: [string, string, string?][]; totalLabel: string; total: string; note?: string }
  | { kind: 'info'; rows: [string, string][] }
  | { kind: 'code'; label: string; code: string; note?: string }
  | { kind: 'note'; strong: string; text: string; tone?: 'green' | 'gold' | 'red' }
  | { kind: 'tracker'; at: 0 | 1 | 2 | 3 }
  | { kind: 'stars'; q: string; url: string }
  | { kind: 'products'; items: { name: string; price: string; img?: string | null; url: string }[] }
  | { kind: 'quote'; who: string; at: string; text: string }
  | { kind: 'review'; who: string; stars: number; product: string; text: string };

const img = (src: string | null | undefined) => (src ? (src.startsWith('http') ? src : env.siteUrl + src) : '');

function block(b: Block): string {
  switch (b.kind) {
    case 'text': return row(`<div style="font-size:15px;line-height:1.75;color:#4D5A52">${b.html}</div>`, '20px 36px 0');
    case 'button': return row(`<a href="${esc(b.url)}" style="display:inline-block;padding:15px 30px;border-radius:4px;background:#0B3A23;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none">${esc(b.label)}</a>${b.sub ? `<div style="margin-top:12px;font-size:13px;color:#66736B">${esc(b.sub)}</div>` : ''}`, '26px 36px 4px');
    case 'buttons': return row(`<a href="${esc(b.url)}" style="display:inline-block;margin:0 8px 8px 0;padding:15px 26px;border-radius:4px;background:#0B3A23;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none">${esc(b.label)}</a><a href="${esc(b.altUrl)}" style="display:inline-block;margin:0 0 8px;padding:13px 22px;border-radius:4px;border:2px solid ${b.altColor || '#0B3A23'};color:${b.altColor || '#0B3A23'};font-weight:700;font-size:15px;text-decoration:none">${esc(b.alt)}</a>${b.sub ? `<div style="margin-top:6px;font-size:13px;color:#66736B">${esc(b.sub)}</div>` : ''}`, '26px 36px 4px');
    case 'boxes': return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${b.boxes.map(([k, v], i) => `<td class="stack" width="${Math.floor(100 / b.boxes.length)}%" style="padding:${i ? '0 0 0 10px' : '0'};vertical-align:top"><div style="padding:14px 16px;border-radius:6px;background:#F1F5F1">${label(esc(k))}<div style="margin-top:4px;font-size:16px;font-weight:700;color:#0B3A23">${esc(v)}</div></div></td>`).join('')}</tr></table>`);
    case 'items': return row(`<div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#66736B;padding-bottom:8px;border-bottom:1.5px solid #1F2A23">${esc(b.title)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${b.rows.map(r => `<tr>
        <td width="64" style="padding:12px 0;border-bottom:1px solid #EFEBE3;vertical-align:middle">${r.img ? `<img src="${esc(img(r.img))}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border-radius:6px;object-fit:cover;background:#F6F1E7">` : `<div style="width:52px;height:52px;line-height:52px;border-radius:6px;background:#F6F1E7;text-align:center;font-family:${SERIF};font-style:italic;font-size:18px;color:#8A5F1C">${esc(r.name[0] || '')}</div>`}</td>
        <td style="padding:12px 10px 12px 0;border-bottom:1px solid #EFEBE3;vertical-align:middle"><div style="font-weight:600;font-size:14.5px">${esc(r.name)}</div><div style="font-size:13px;color:#66736B">${esc(r.meta)}</div>${r.swap ? `<div style="font-size:12.5px;color:#8A5F1C">Swapped: ${esc(r.swap)}</div>` : ''}</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #EFEBE3;vertical-align:middle;font-weight:600;font-size:14.5px;white-space:nowrap">${esc(r.price)}</td></tr>`).join('')}</table>`);
    case 'totals': return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${b.rows.map(([k, v, c]) => `<tr><td style="padding:4px 0;font-size:14.5px;color:${c || '#1F2A23'}">${esc(k)}</td><td align="right" style="padding:4px 0;font-size:14.5px;color:${c || '#1F2A23'};white-space:nowrap">${esc(v)}</td></tr>`).join('')}
      <tr><td style="padding:12px 0 0;border-top:1.5px solid #1F2A23;font-weight:700;font-size:16px">${esc(b.totalLabel)}</td><td align="right" style="padding:12px 0 0;border-top:1.5px solid #1F2A23;font-weight:700;font-size:22px">${esc(b.total)}</td></tr></table>${b.note ? `<div style="margin-top:6px;font-size:12.5px;color:#66736B">${esc(b.note)}</div>` : ''}`, '10px 36px 0');
    case 'info': return row(`<div style="border:1px solid #ECE8DF;border-radius:6px;padding:16px 18px">${b.rows.map(([k, v]) => `<div style="padding:5px 0">${label(esc(k))}<div style="font-size:14.5px;line-height:1.55">${v}</div></div>`).join('')}</div>`);
    case 'code': return row(`<div style="display:inline-block;padding:18px 26px;border:1.5px dashed #D49B41;border-radius:8px;background:#FBF6EA">${label(`<span style="color:#8A5F1C">${esc(b.label)}</span>`)}<div style="margin-top:6px;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;letter-spacing:.14em;color:#0B3A23">${esc(b.code)}</div></div>${b.note ? `<div style="margin-top:10px;font-size:13px;color:#66736B">${esc(b.note)}</div>` : ''}`, '26px 36px 0', 'text-align:center');
    case 'note': { const [bg, fg] = { green: ['#E6EEE8', '#0B3A23'], gold: ['#FBF2DE', '#5C430F'], red: ['#FBEFEB', '#7A2A1B'] }[b.tone || 'green']; return row(`<div style="padding:14px 16px;border-radius:6px;background:${bg};color:${fg};font-size:14px;line-height:1.6"><strong style="font-weight:700">${esc(b.strong)}</strong> ${esc(b.text)}</div>`, '22px 36px 0'); }
    case 'tracker': return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${['Paid', 'Packed', 'On the way', 'Delivered'].map((l, i) => `<td width="25%" style="padding:0 ${i < 3 ? '6px' : '0'} 0 0;vertical-align:top"><div style="height:4px;border-radius:4px;background:${i <= b.at ? '#0B3A23' : '#E6E2D8'}"></div><div style="padding-top:8px;font-size:12px;font-weight:${i === b.at ? 700 : 500};color:${i <= b.at ? '#0B3A23' : '#8B958E'}">${l}</div></td>`).join('')}</tr></table>`);
    case 'stars': return row(`<div style="font-size:14px;font-weight:600">${esc(b.q)}</div><div style="margin-top:10px">${[1, 2, 3, 4, 5].map(n => `<a href="${esc(b.url)}&stars=${n}" style="display:inline-block;width:44px;height:44px;line-height:44px;margin:0 3px;border-radius:50%;border:1.5px solid #E6D3AE;color:#D49B41;font-size:22px;text-decoration:none">★</a>`).join('')}</div><div style="margin-top:8px;font-size:12.5px;color:#66736B">Tap a star. It takes ten seconds.</div>`, '24px 36px 0', 'text-align:center');
    case 'products': return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${b.items.slice(0, 3).map((p, i) => `<td class="stack" width="33%" style="padding:${i ? '0 0 0 12px' : '0'};vertical-align:top"><a href="${esc(p.url)}" style="display:block;border:1px solid #ECE8DF;border-radius:6px;overflow:hidden;text-align:center;text-decoration:none;color:#1F2A23">${p.img ? `<img src="${esc(img(p.img))}" width="100%" alt="" style="display:block;width:100%;height:auto">` : `<div style="padding:44px 8px;background:#F6F1E7;font-family:${SERIF};font-style:italic;font-size:20px;color:#8A5F1C">${esc(p.name)}</div>`}<div style="padding:10px 8px;font-size:13.5px;font-weight:600">${esc(p.name)}<div style="font-weight:500;color:#66736B;font-size:12.5px">${esc(p.price)}</div></div></a></td>`).join('')}</tr></table>`);
    case 'quote': return row(`<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="50" style="vertical-align:top"><div style="width:38px;height:38px;line-height:38px;border-radius:50%;background:#D49B41;color:#0B3A23;font-weight:700;text-align:center">${esc(b.who[0] || '?')}</div></td><td style="vertical-align:top"><div style="font-size:13px;color:#66736B"><strong style="color:#1F2A23;font-weight:600">${esc(b.who)}</strong> · ${esc(b.at)}</div><div style="margin-top:6px;padding:14px 16px;border-radius:4px 14px 14px 14px;background:#F6F1E7;font-size:15px;line-height:1.6;color:#1F2A23;white-space:pre-line">${esc(b.text)}</div></td></tr></table>`);
    case 'review': return row(`<div style="border:1px solid #ECE8DF;border-radius:6px;padding:18px"><div><span style="font-weight:600">${esc(b.who)}</span> <span style="color:#D49B41;font-size:18px;letter-spacing:2px">${'★'.repeat(b.stars)}${'☆'.repeat(5 - b.stars)}</span></div><div style="font-size:13px;color:#66736B">${esc(b.product)}</div><div style="margin-top:8px;font-size:15px;line-height:1.65">${esc(b.text)}</div></div>`);
  }
}

export type Mail = { kicker: string; title: string; intro: string; blocks?: Block[]; preheader?: string; owner?: boolean; why?: string; unsubUrl?: string; center?: boolean };

/** Build a full email from a heading and blocks. */
export function render(m: Mail) {
  const site = env.siteUrl;
  const foot = m.owner
    ? `<div style="font-family:${SERIF};font-style:italic;font-size:17px;color:#F6E9CF">Tiada admin desk</div>
       <div style="margin-top:6px">Only you and your staff get these emails.</div>
       <div style="margin-top:10px;font-weight:600"><a href="${site}/admin" style="color:#E9B969;text-decoration:none">Open the desk</a> &nbsp;·&nbsp; <a href="${site}/admin#settings" style="color:#E9B969;text-decoration:none">Choose which emails you get</a></div>`
    : `<div style="font-family:${SERIF};font-style:italic;font-size:17px;color:#F6E9CF">Your trusted plug</div>
       <div style="margin-top:6px">Questions? Reply to this email or WhatsApp <a href="https://wa.me/2348075110000" style="color:#E9B969">0807 511 0000</a></div>
       <div>27, Finance Road, Maplewood Estate, Agege, Lagos</div>
       <div style="margin-top:10px;font-weight:600"><a href="${site}" style="color:#E9B969;text-decoration:none">Shop</a> &nbsp;·&nbsp; <a href="${site}/track" style="color:#E9B969;text-decoration:none">Track an order</a> &nbsp;·&nbsp; <a href="https://www.tiktok.com/@tiadamarketplace" style="color:#E9B969;text-decoration:none">TikTok</a></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(m.title)}</title>
<style>@media (max-width:620px){.px{padding-left:20px!important;padding-right:20px!important}.stack{display:block!important;width:100%!important;padding:0 0 10px!important}h1{font-size:28px!important}}</style></head>
<body style="margin:0;padding:0;background:#F3F0E9;font-family:${SANS};color:#1F2A23">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(m.preheader || m.intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F0E9"><tr><td align="center" style="padding:24px 10px 36px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;font-family:${SANS};font-size:15px;line-height:1.6;color:#1F2A23">
<tr><td style="background:#FBF9F4;text-align:center;padding:24px 20px 20px;border-bottom:3px solid #D49B41"><a href="${site}"><img src="${site}/logo-sm.png" width="120" alt="Tiada Marketplace" style="display:inline-block;width:120px;height:auto;border:0"></a></td></tr>
${row(`<div style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#8A5F1C">${esc(m.kicker)}</div>
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-style:italic;font-weight:500;font-size:34px;line-height:1.15;color:#0B3A23">${esc(m.title)}</h1>
  <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#4D5A52">${esc(m.intro)}</p>`, '34px 36px 6px', m.center ? 'text-align:center' : '')}
${(m.blocks || []).map(block).join('\n')}
<tr><td style="height:34px"></td></tr>
<tr><td class="px" style="background:#0B3A23;color:rgba(236,241,237,0.82);padding:26px 36px;text-align:center;font-size:12.5px;line-height:1.8">${foot}
  ${m.why || m.unsubUrl ? `<div style="margin-top:12px;font-size:11.5px;opacity:.7">${esc(m.why || '')}${m.unsubUrl ? ` <a href="${esc(m.unsubUrl)}" style="color:rgba(236,241,237,0.9)">Unsubscribe</a>` : ''}</div>` : ''}
</td></tr></table></td></tr></table></body></html>`;
}

/** Plain-text twin for mail apps that don't show HTML (and for spam filters). */
export function plain(m: Mail) {
  const t = (m.blocks || []).map(b => {
    switch (b.kind) {
      case 'text': return b.html.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '');
      case 'button': return `${b.label}: ${b.url}`;
      case 'buttons': return `${b.label}: ${b.url}\n${b.alt}: ${b.altUrl}`;
      case 'boxes': return b.boxes.map(([k, v]) => `${k}: ${v}`).join('\n');
      case 'items': return b.rows.map(r => `- ${r.name} (${r.meta}) ${r.price}`).join('\n');
      case 'totals': return b.rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n${b.totalLabel}: ${b.total}`;
      case 'info': return b.rows.map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, '')}`).join('\n');
      case 'code': return `${b.label}: ${b.code}`;
      case 'note': return `${b.strong} ${b.text}`;
      case 'quote': return `${b.who}: ${b.text}`;
      case 'review': return `${b.who} (${b.stars}/5) on ${b.product}: ${b.text}`;
      default: return '';
    }
  }).filter(Boolean).join('\n\n');
  return `${m.title}\n\n${m.intro}\n\n${t}\n\n— Tiada Marketplace · WhatsApp 0807 511 0000`;
}

/** Old one-off emails (admin password reset, broadcasts) use this simple wrapper around the same style. */
export function layout(o: { heading: string; bodyHtml: string; cta?: { label: string; url: string }; preheader?: string; kicker?: string }) {
  return render({ kicker: o.kicker || 'Tiada Marketplace', title: o.heading, intro: '', preheader: o.preheader, blocks: [{ kind: 'text', html: o.bodyHtml }, ...(o.cta ? [{ kind: 'button', label: o.cta.label, url: o.cta.url } as Block] : [])] });
}

/** Send through Resend. Returns the email id, or null if email isn't set up yet. */
export async function sendEmail(to: string, subject: string, html: string, text?: string, replyTo?: string): Promise<{ id: string | null; ok: boolean; error?: string }> {
  if (!env.resendKey) return { id: null, ok: false, error: 'RESEND_API_KEY not set' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom, to: [to], subject, html, text: text || subject, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { id: null, ok: false, error: j.message || String(r.status) };
    return { id: j.id || null, ok: true };
  } catch (e) { return { id: null, ok: false, error: (e as Error).message }; }
}
export const sendMail = (to: string, subject: string, m: Mail, replyTo?: string) => sendEmail(to, subject, render(m), plain(m), replyTo);

/** Up to 100 emails per call. */
export async function sendBatch(msgs: { to: string; subject: string; html: string; text?: string }[]) {
  if (!env.resendKey) return { sent: 0 };
  let sent = 0;
  for (let i = 0; i < msgs.length; i += 100) {
    const chunk = msgs.slice(i, i + 100).map(m => ({ from: env.emailFrom, to: [m.to], subject: m.subject, html: m.html, ...(m.text ? { text: m.text } : {}) }));
    const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(chunk) });
    if (r.ok) sent += chunk.length;
  }
  return { sent };
}
export { naira };
