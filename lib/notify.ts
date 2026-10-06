import { db, must } from './db';
import { env } from './env';
import { layout, itemsTable, sendEmail, esc, naira } from './email';

export type Order = {
  id: string; customer_id: string | null; email: string; name: string; phone: string; address: string; landmark: string | null;
  zone_id: string | null; area_label: string | null; speed: string; speed_label: string | null; items: { name: string; size: string; qty: number; price: number; swaps?: { from: string; to: string }[] }[];
  subtotal: number; discount: number; voucher: string | null; delivery_fee: number; total: number; kg: number; status: string; prev_status: string | null;
  pay_ref: string | null; pay_account: unknown; paid_at: string | null; rider: { partner?: string; tracking?: string; driver?: string; phone?: string; cost?: number } | null;
  confirm: unknown; issue: { reason?: string; note?: string; eta?: string } | null; refunds: { amount: number; reason: string; at: string }[]; note: string | null; created_at: string;
};
export type Kind = 'placed' | 'route' | 'done' | 'issue' | 'refund' | 'cancel' | 'note';
type Data = { reason?: string; note?: string; eta?: string; amount?: number; full?: boolean };

const fmtPhone = (p?: string) => { const d = (p || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : d; };
const p = (s: string) => `<p style="margin:0 0 12px">${s}</p>`;
const box = (s: string) => `<div style="background:#F4F7F4;border-radius:10px;padding:12px 14px;margin:6px 0 14px">${s}</div>`;

export function compose(o: Order, kind: Kind, d: Data = {}) {
  const first = esc(o.name.split(' ')[0]);
  const track = `${env.siteUrl}/#track-${o.id}`;
  const r = o.rider || {};
  const extras: [string, number][] = [['Delivery', o.delivery_fee], ...(o.discount ? [[`Voucher ${o.voucher || ''}`, -o.discount] as [string, number]] : [])];
  switch (kind) {
    case 'placed': return {
      subject: `Order confirmed: ${o.id} · Tiada Marketplace`, title: 'Order confirmed',
      inbox: `We confirmed ${naira(o.total)} for ${o.id}. Your items are being packed.`,
      html: layout({ heading: 'Thank you for your order!', preheader: `Payment received for ${o.id}`, cta: { label: 'Track my order', url: track }, bodyHtml:
        p(`Hello ${first},`) + p('We’ve received your payment and your order is now being packed at our Ojota hub.') +
        box(`<b>Tracking code: ${o.id}</b><br><span style="font-size:13px;color:#6B7A70">Use it any time with “Track an order”.</span>`) +
        itemsTable(o.items, o.total, extras) + p(`<b>Delivery:</b> ${esc(o.speed_label || o.speed)}<br><b>Address:</b> ${esc(o.address)}${o.area_label ? ', ' + esc(o.area_label) : ''}`) +
        p('We’ll email you again as soon as your order is on the way.') }) };
    case 'route': return {
      subject: `Your order ${o.id} is on the way!`, title: 'Your order is on the way',
      inbox: `${o.id} is on the way with ${r.partner || 'our delivery partner'}${r.tracking ? ' (' + r.tracking + ')' : ''}. Keep your phone line open.`,
      html: layout({ heading: 'Your order is on the way', cta: { label: 'Track my order', url: track }, bodyHtml:
        p(`Hello ${first},`) + p(`Your order <b>${o.id}</b> has been packed, quality checked and handed to our delivery partner.`) +
        box(`<b>Delivery partner:</b> ${esc(r.partner || '')}${r.tracking ? `<br><b>Tracking number:</b> ${esc(r.tracking)}` : ''}${r.driver ? `<br><b>Driver:</b> ${esc(r.driver)}` : ''}${r.phone ? `<br><b>Phone:</b> ${fmtPhone(r.phone)}` : ''}<br><b>Speed:</b> ${esc(o.speed_label || o.speed)}`) +
        p('Please keep your phone line open so the driver can reach you.') }) };
    case 'done': return {
      subject: `Delivered: enjoy your order ${o.id}`, title: `Delivered: ${o.id}`,
      inbox: 'Enjoy your foodstuffs! Rate what you bought to help other buyers.',
      html: layout({ heading: 'Delivered! Enjoy your food', cta: { label: 'Rate your order', url: `${env.siteUrl}/#reviews` }, bodyHtml:
        p(`Hello ${first},`) + p(`Your order <b>${o.id}</b> has been delivered to ${esc(o.address)}.`) + itemsTable(o.items, o.total, extras) +
        p('Something missing or damaged? Reply to this email or WhatsApp us on 08075110000 within 24 hours with your TD code and a photo.') }) };
    case 'issue': return {
      subject: `An update on your order ${o.id}`, title: 'An update on your order',
      inbox: `${d.reason || 'There’s a problem with your order'}.${d.eta ? ' New expected delivery: ' + d.eta + '.' : ''}`,
      html: layout({ heading: 'An update on your order', cta: { label: 'Track my order', url: track }, bodyHtml:
        p(`Hello ${first},`) + p(`We’re sorry, there’s a problem with your order <b>${o.id}</b>.`) +
        box(`<b>What happened:</b> ${esc(d.reason || '')}${d.note ? `<br>${esc(d.note)}` : ''}${d.eta ? `<br><b>New expected delivery:</b> ${esc(d.eta)}` : ''}`) +
        p('We’re working on it and will update you again. Questions? Reply to this email or WhatsApp us on 08075110000.') }) };
    case 'refund': return {
      subject: `Refund for your order ${o.id}`, title: 'Refund sent',
      inbox: `${naira(d.amount || 0)} for ${o.id} is being refunded to your bank. ${d.reason || ''}`,
      html: layout({ heading: 'Your refund is on its way', cta: { label: 'Shop again', url: env.siteUrl }, bodyHtml:
        p(`Hello ${first},`) + p(`We’ve started a refund of <b>${naira(d.amount || 0)}</b> for your order <b>${o.id}</b>${d.full ? '' : ' (part of your order)'}.`) +
        box(`<b>Reason:</b> ${esc(d.reason || '')}${d.note ? `<br>${esc(d.note)}` : ''}<br><b>Refunded to:</b> the bank account you paid from`) +
        p('It usually shows in your bank app within 1–3 working days. If our payment provider needs your account number to send it, we’ll contact you. We’re sorry for the trouble.') }) };
    case 'cancel': return {
      subject: `Your order ${o.id} has been cancelled`, title: 'Order cancelled',
      inbox: `${o.id} was cancelled and ${naira(o.total)} is being refunded. ${d.reason || ''}`,
      html: layout({ heading: 'Your order has been cancelled', cta: { label: 'Shop again', url: env.siteUrl }, bodyHtml:
        p(`Hello ${first},`) + p(`Your order <b>${o.id}</b> has been cancelled.`) + box(`<b>Reason:</b> ${esc(d.reason || '')}${d.note ? `<br>${esc(d.note)}` : ''}`) +
        p(`We’ve started a refund of the full <b>${naira(o.total)}</b> to the bank account you paid from. It usually shows within 1–3 working days. If our payment provider needs your account number to send it, we’ll contact you.`) }) };
    case 'note': return {
      subject: `A message about your order ${o.id}`, title: 'A message about your order', inbox: d.note || '',
      html: layout({ heading: 'A message about your order', cta: { label: 'Track my order', url: track }, bodyHtml:
        p(`Hello ${first},`) + p(esc(d.note || '').replace(/\n/g, '<br>')) + p(`Order: <b>${o.id}</b>`) }) };
  }
}

/** Save to the customer's inbox and email them. Never throws: a failed email must not break an order update. */
export async function notifyOrder(o: Order, kind: Kind, d: Data = {}) {
  const m = compose(o, kind, d);
  const sent = await sendEmail(o.email, m.subject, m.html);
  try {
    let cid = o.customer_id;
    if (!cid) cid = ((await db().from('customers').select('id').eq('email', o.email).maybeSingle()).data as { id: string } | null)?.id || null;
    must(await db().from('messages').insert({ customer_id: cid, order_id: o.id, kind, title: m.title, body: m.inbox, data: d, email_to: o.email, email_id: sent.id, email_ok: sent.ok }));
  } catch (e) { console.error('message save failed', e); }
  return sent;
}

export async function alertAdmin(subject: string, html: string) {
  if (env.adminAlert) await sendEmail(env.adminAlert, subject, layout({ heading: subject, bodyHtml: html, cta: { label: 'Open admin desk', url: `${env.siteUrl}/admin` } }));
}
