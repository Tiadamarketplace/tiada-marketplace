import { db, must } from './db';
import { env } from './env';
import { render, plain, sendEmail, sendMail, naira, esc, Block, Mail } from './email';
import { photoFor } from './photos';

export type Order = {
  id: string; customer_id: string | null; email: string; name: string; phone: string; address: string; landmark: string | null;
  zone_id: string | null; drop_code?: string | null; spot?: { days?: string; lat: number; lng: number } | null; area_label: string | null; speed: string; speed_label: string | null;
  items: { pid?: string; name: string; size: string; qty: number; price: number; img?: string | null; swaps?: { from: string; to: string }[] }[];
  subtotal: number; discount: number; voucher: string | null; delivery_fee: number; total: number; kg: number; status: string; prev_status: string | null;
  pay_ref: string | null; pay_account: unknown; paid_at: string | null; rider: { partner?: string; tracking?: string; driver?: string; phone?: string; cost?: number } | null;
  confirm: unknown; issue: { reason?: string; note?: string; eta?: string } | null; refunds: { amount: number; reason: string; at: string }[]; note: string | null; created_at: string;
};
export type Kind = 'placed' | 'packed' | 'route' | 'done' | 'issue' | 'refund' | 'cancel' | 'note';
type Data = { reason?: string; note?: string; eta?: string; amount?: number; full?: boolean };

const fmtPhone = (p?: string) => { const d = (p || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : d; };
const first = (n: string) => (n || '').trim().split(/\s+/)[0] || 'there';
const site = () => env.siteUrl;

const itemsBlock = (o: Order, title = 'Your order'): Block => ({ kind: 'items', title, rows: o.items.map(i => ({
  name: i.name, meta: `${i.size !== 'Package' ? i.size + ' · ' : ''}Qty ${i.qty}`, price: naira(i.price * i.qty), img: i.img || (i.pid ? photoFor(i.pid, null) : null),
  swap: i.swaps?.length ? i.swaps.map(w => `${w.from} → ${w.to}`).join(', ') : undefined })) });
const totalsBlock = (o: Order, label = 'Total paid'): Block => ({ kind: 'totals', totalLabel: label, total: naira(o.total), rows: [
  ['Subtotal', naira(o.subtotal)], ['Delivery' + (o.speed_label ? ` · ${o.speed_label}` : ''), naira(o.delivery_fee)],
  ...(o.discount ? [[`Discount ${o.voucher || ''}`.trim(), '−' + naira(o.discount), '#0B3A23'] as [string, string, string]] : [])] });

async function zoneOf(o: Order) {
  if (!o.zone_id) return null;
  return (await db().from('zones').select('label,day,state,days').eq('id', o.zone_id).maybeSingle()).data as { label: string; day: string | null; state: string | null; days: string | null } | null;
}
const whenText = (o: Order, z: Awaited<ReturnType<typeof zoneOf>>) =>
  o.speed === 'same' ? 'Today or tomorrow morning' : o.spot?.days ? `Usually ${o.spot.days}` : z?.state ? `By courier, ${z.days || '2–5 working days'}` : z?.day ? `On ${z.day}` : 'Usually the next day';

/** The customer email for each step of an order. */
/** The delivery code, shown big in the confirmation and on-the-way emails. */
const codeBlock = (o: Order): Block[] => o.drop_code ? [{ kind: 'note', strong: `Your delivery code: ${o.drop_code}`, text: 'Give this code to our rider when your order arrives. Only share it at the door, once you have your order.', tone: 'gold' }] : [];

export async function compose(o: Order, kind: Kind, d: Data = {}): Promise<{ subject: string; title: string; inbox: string; mail: Mail }> {
  const z = await zoneOf(o);
  const when = whenText(o, z);
  const track = `${site()}/track?code=${o.id}`;
  const r = o.rider || {};
  const addr = `${esc(o.address)}${o.area_label ? ', ' + esc(o.area_label) : ''}`;
  switch (kind) {
    case 'placed': return {
      subject: `Order ${o.id} is confirmed`, title: 'Order confirmed', inbox: `We received ${naira(o.total)} for ${o.id}. We’re getting it ready.`,
      mail: { kicker: `Order confirmed · ${o.id}`, title: `Thank you, ${first(o.name)}.`, intro: 'We’ve got your payment and we’re getting your order ready. Here’s everything in one place.', preheader: `${naira(o.total)} received. Arrives ${when.toLowerCase()}.`, blocks: [
        { kind: 'boxes', boxes: [['Tracking code', o.id], ['Arrives', when]] }, ...codeBlock(o), { kind: 'tracker', at: 0 }, itemsBlock(o), totalsBlock(o),
        { kind: 'info', rows: [['Delivering to', `${esc(o.name)} · ${fmtPhone(o.phone)}<br>${addr}${o.landmark ? `<br><span style="color:#66736B">Near ${esc(o.landmark)}</span>` : ''}`]] },
        { kind: 'button', label: 'Track my order', url: track, sub: 'We’ll email you again when it’s packed and when it leaves our hub.' }] } };
    case 'packed': return {
      subject: 'Your order is packed and ready', title: 'Order packed', inbox: `${o.id} is packed and sealed. It goes out ${when.toLowerCase()}.`,
      mail: { kicker: `Packed · ${o.id}`, title: 'Packed and sealed.', intro: `Your order has been measured, packed and sealed at our hub. It goes out ${when.toLowerCase()}.`, blocks: [
        { kind: 'tracker', at: 1 }, itemsBlock(o, 'In the bag'), { kind: 'button', label: 'Track my order', url: track }] } };
    case 'route': {
      const courier = !!r.tracking && !r.driver;
      return {
        subject: r.driver ? `${r.driver} is on the way with your order` : `Your order ${o.id} is on the way`, title: 'Your order is on the way',
        inbox: `${o.id} is on the way with ${r.driver || r.partner || 'our rider'}${r.tracking ? ' (' + r.tracking + ')' : ''}.`,
        mail: { kicker: `On the way · ${o.id}`, title: r.driver ? 'Your rider is on the way.' : 'Your order is on the way.', intro: r.driver ? `${r.driver} left our hub with your order. They’ll call when they’re close, so keep your phone nearby.` : `We’ve handed your order to ${r.partner || 'the courier'}.`, blocks: [
          ...codeBlock(o),
          { kind: 'tracker', at: 2 },
          { kind: 'info', rows: [
            ...(r.driver ? [['Rider', `${esc(r.driver)}${r.phone ? ` · <a href="tel:${esc(r.phone)}" style="color:#0B3A23">${fmtPhone(r.phone)}</a>` : ''}`] as [string, string]] : []),
            ...(r.partner && (courier || !r.driver) ? [['Courier', esc(r.partner)] as [string, string]] : []),
            ...(r.tracking ? [['Tracking number', esc(r.tracking)] as [string, string]] : []),
            ['Delivering to', addr]] },
          { kind: 'button', label: 'Track my order', url: track }] } };
    }
    case 'done': {
      const pid = o.items.find(i => i.pid)?.pid;
      return {
        subject: 'Delivered. How did we do?', title: `Delivered: ${o.id}`, inbox: 'Your order was delivered. Tell us how everything arrived.',
        mail: { kicker: `Delivered · ${o.id}`, title: `Enjoy, ${first(o.name)}.`, intro: 'Your order has been delivered. We’d love to know how everything arrived.', center: true, blocks: [
          { kind: 'tracker', at: 3 },
          ...(pid ? [{ kind: 'stars', q: 'How was your order?', url: `${site()}/p/${pid}?rate=1` } as Block] : []),
          { kind: 'note', strong: 'Something missing or damaged?', text: 'Reply to this email or WhatsApp us within 24 hours with a photo, and we’ll put it right.', tone: 'gold' },
          { kind: 'button', label: 'Order the same again', url: `${site()}/account` }] } };
    }
    case 'issue': return {
      subject: `An update on your order ${o.id}`, title: 'An update on your order', inbox: `${d.reason || 'There’s a problem with your order'}.${d.eta ? ' New date: ' + d.eta + '.' : ''}`,
      mail: { kicker: `Update · ${o.id}`, title: 'Sorry, a small delay.', intro: `Something has come up with your order ${o.id}. Here’s what happened and what we’re doing about it.`, blocks: [
        { kind: 'note', strong: d.reason || 'A problem with your order.', text: d.note || '', tone: 'gold' },
        ...(d.eta ? [{ kind: 'boxes', boxes: [['New delivery date', d.eta]] } as Block] : []),
        { kind: 'text', html: 'Questions? Just reply to this email or message us on WhatsApp on 0807 511 0000.' },
        { kind: 'button', label: 'Track my order', url: track }] } };
    case 'refund': return {
      subject: d.full ? `Your refund for ${o.id}` : 'We’ve sorted your order', title: 'Refund sent', inbox: `${naira(d.amount || 0)} for ${o.id} is being refunded. ${d.reason || ''}`,
      mail: { kicker: `Update · ${o.id}`, title: 'Sorry about that.', intro: `${d.reason ? d.reason + '. ' : ''}We’ve refunded ${naira(d.amount || 0)} to the card or account you paid with.`, blocks: [
        { kind: 'boxes', boxes: [['Refunded', naira(d.amount || 0)], ['Shows in your bank', '5–10 working days']] },
        ...(d.note ? [{ kind: 'text', html: esc(d.note).replace(/\n/g, '<br>') } as Block] : []),
        { kind: 'button', label: 'Shop again', url: site() }] } };
    case 'cancel': return {
      subject: `Your order ${o.id} has been cancelled`, title: 'Order cancelled', inbox: `${o.id} was cancelled and ${naira(o.total)} is being refunded. ${d.reason || ''}`,
      mail: { kicker: `Cancelled · ${o.id}`, title: 'Your order is cancelled.', intro: `We’ve cancelled order ${o.id} and refunded the full ${naira(o.total)} to the card or account you paid with.`, blocks: [
        { kind: 'note', strong: 'Why:', text: [d.reason, d.note].filter(Boolean).join('. '), tone: 'gold' },
        { kind: 'boxes', boxes: [['Refunded', naira(o.total)], ['Shows in your bank', '5–10 working days']] },
        { kind: 'button', label: 'Shop again', url: site() }] } };
    case 'note': return {
      subject: `A message about your order ${o.id}`, title: 'A message about your order', inbox: d.note || '',
      mail: { kicker: `Order ${o.id}`, title: `A note for you, ${first(o.name)}.`, intro: '', blocks: [
        { kind: 'text', html: esc(d.note || '').replace(/\n/g, '<br>') }, { kind: 'button', label: 'Track my order', url: track }] } };
  }
}

/** Save to the customer's inbox and email them. Never throws: a failed email must not break an order update. */
export async function notifyOrder(o: Order, kind: Kind, d: Data = {}) {
  let sent: { id: string | null; ok: boolean; error?: string } = { id: null, ok: false, error: 'not sent' };
  try {
    const m = await compose(o, kind, d);
    sent = await sendMail(o.email, m.subject, m.mail);
    let cid = o.customer_id;
    if (!cid) cid = ((await db().from('customers').select('id').eq('email', o.email).maybeSingle()).data as { id: string } | null)?.id || null;
    must(await db().from('messages').insert({ customer_id: cid, order_id: o.id, kind, title: m.title, body: m.inbox, data: d, email_to: o.email, email_id: sent.id, email_ok: sent.ok }));
  } catch (e) { console.error('order email failed', e); }
  return sent;
}

/* ------------------------------------ customer emails ------------------------------------ */

export async function welcomeAccount(email: string, name: string | null) {
  return sendMail(email, `Welcome to Tiada${name ? ', ' + first(name) : ''}`, {
    kicker: 'Welcome', title: `Good to have you${name ? ', ' + first(name) : ''}.`, intro: 'Your Tiada account is ready. Save your address once, track every order, and buy the same basket again in one tap.',
    blocks: [{ kind: 'info', rows: [['How you sign in', 'No password. Each time, we email you a 6-digit code.'], ['Your orders', 'Every order you place with this email shows under My account.']] }, { kind: 'button', label: 'Start shopping', url: site() }],
  });
}
export async function welcomeList(email: string, token: string) {
  const unsub = `${site()}/unsubscribe?email=${encodeURIComponent(email)}&t=${token}`;
  return sendMail(email, 'You’re on the Tiada list', {
    kicker: 'You’re in', title: 'Thanks for joining us.', intro: 'We’ll email you when fresh stock lands, when combos go on sale, and before holidays. A few times a month at most.',
    blocks: [{ kind: 'button', label: 'See what’s new', url: site() }], why: 'You’re getting this because you joined our list on tiadamarketplace.com.', unsubUrl: unsub,
  });
}
export async function signInCode(email: string, code: string) {
  return sendMail(email, `${code} is your Tiada sign-in code`, {
    kicker: 'Account', title: 'Your sign-in code.', intro: 'Use this code to sign in to Tiada Marketplace. It works for 10 minutes.', preheader: `${code} is your code`,
    blocks: [{ kind: 'code', label: 'Sign-in code', code, note: 'Never share this code. Tiada staff will never ask for it.' }, { kind: 'text', html: 'If you didn’t try to sign in, you can ignore this email. Nobody can get in without the code.' }],
  });
}
export async function notPaid(o: Order) {
  return sendMail(o.email, 'Your Tiada order wasn’t paid', {
    kicker: 'Order not completed', title: 'Your basket is still here.', intro: `We didn’t receive payment for order ${o.id}, so we haven’t packed it. No money was taken. If you still want it, it’s one tap away.`,
    blocks: [itemsBlock(o, 'In your basket'), { kind: 'button', label: 'Finish my order', url: `${site()}/checkout`, sub: 'Paid and money left your account? Reply to this email with your bank receipt.' }],
  });
}
/** "Tell me when it's back": called when admin adds stock to a size that people are waiting on. */
export async function backInStock(pid: string, size: string) {
  const p = (await db().from('products').select('id,name,img,sizes').eq('id', pid).maybeSingle()).data as { id: string; name: string; img: string | null; sizes: { label: string; price: number | null; sale: number | null }[] } | null;
  if (!p) return { sent: 0 };
  const waiting = must(await db().from('stock_alerts').select('id,email').eq('product_id', pid).eq('size', size).is('notified_at', null).limit(500)) as { id: string; email: string }[];
  if (!waiting.length) return { sent: 0 };
  const s = p.sizes.find(x => x.label === size);
  const price = s ? (s.sale && s.price && s.sale < s.price ? s.sale : s.price) : null;
  const what = size === 'Package' ? p.name : `${p.name} ${size}`;
  const m: Mail = { kicker: 'Back in stock', title: `${what} is back.`, intro: 'You asked us to let you know. We’ve just restocked it, and it tends to go quickly.',
    blocks: [{ kind: 'items', title: 'Back now', rows: [{ name: p.name, meta: size === 'Package' ? 'Combo' : size, price: price ? naira(price) : '', img: photoFor(p.id, p.img) }] }, { kind: 'button', label: 'Get it now', url: `${site()}/p/${p.id}` }],
    why: 'You asked to be told when this was back. We won’t email you about it again.' };
  let sent = 0;
  for (const w of waiting) { const r = await sendEmail(w.email, `${what} is back`, render(m), plain(m)); if (r.ok) sent++; }
  await db().from('stock_alerts').update({ notified_at: new Date().toISOString() }).in('id', waiting.map(w => w.id));
  return { sent };
}

/* ------------------------------------ owner emails ------------------------------------ */

type Alerts = { email?: boolean; emailTo?: string; daily?: boolean; lowStock?: boolean };
async function ownerTo(kind: 'order' | 'daily' | 'low' | 'other' = 'other') {
  const a = ((await db().from('settings').select('value').eq('key', 'alerts').maybeSingle()).data as { value: Alerts } | null)?.value || {};
  if (kind === 'daily' && a.daily === false) return '';
  if (kind === 'low' && a.lowStock === false) return '';
  if (kind !== 'daily' && kind !== 'low' && a.email === false) return '';
  return (a.emailTo || env.adminAlert || '').trim();
}
async function toOwner(kind: Parameters<typeof ownerTo>[0], subject: string, m: Mail, replyTo?: string) {
  const to = await ownerTo(kind);
  if (!to) return { ok: false, error: 'no owner email set' };
  return sendMail(to, subject, { ...m, owner: true }, replyTo);
}
const desk = (hash = '') => `${site()}/admin${hash}`;

export async function ownerNewOrder(o: Order) {
  const z = await zoneOf(o);
  const when = whenText(o, z);
  return toOwner('order', `New order ${o.id} · ${naira(o.total)} · ${o.area_label || ''}${z?.day && !z.state ? ', ' + z.day : ''}`, {
    kicker: 'New order', title: `${naira(o.total)} from ${first(o.name)}.`, intro: `Paid and confirmed by Paystack. ${z?.state ? 'It goes by courier' : `It goes ${when.toLowerCase()}`} once you accept it.`,
    blocks: [
      { kind: 'boxes', boxes: [['Order', o.id], ['Area', o.area_label || '—'], ['Weight', `${o.kg} kg`]] },
      itemsBlock(o, 'Pack list'), totalsBlock(o, 'Paid'),
      { kind: 'info', rows: [['Customer', `${esc(o.name)} · <a href="tel:${esc(o.phone)}" style="color:#0B3A23">${fmtPhone(o.phone)}</a>`], ['Address', `${esc(o.address)}${o.landmark ? ` (near ${esc(o.landmark)})` : ''}`], ...(o.note ? [['Their note', esc(o.note)] as [string, string]] : [])] },
      { kind: 'buttons', label: 'Accept order', url: desk(`#order=${o.id}&do=accept`), alt: 'Can’t fill this order', altUrl: desk(`#order=${o.id}&do=issue`), altColor: '#9E3522', sub: 'Can’t fill it? We’ll help you tell the customer and refund them.' }],
  }, o.email);
}
export async function ownerChat(c: { id: string; name: string | null; text?: string }) {
  return toOwner('other', `${c.name || 'A customer'} is waiting for a reply`, {
    kicker: 'Chat · waiting now', title: `${c.name || 'A customer'} asked for a person.`, intro: 'The chat assistant couldn’t help with this one, so it’s passed to you.',
    blocks: [...(c.text ? [{ kind: 'quote', who: c.name || 'Customer', at: 'just now', text: c.text } as Block] : []), { kind: 'button', label: 'Reply in the desk', url: desk(`#chat=${c.id}`) }],
  });
}
export async function ownerReview(r: { name: string; stars: number; product: string; text: string }) {
  return toOwner('other', `New ${r.stars}-star review on ${r.product}`, {
    kicker: 'New review', title: `${first(r.name)} left ${r.stars} star${r.stars === 1 ? '' : 's'}.`, intro: 'Reviews only show in the shop after you approve them.',
    blocks: [{ kind: 'review', who: r.name, stars: r.stars, product: r.product, text: r.text }, { kind: 'button', label: 'Approve or hide', url: desk('#reviews') }],
  });
}
export async function ownerContact(m: { id: string; name: string; email: string; phone?: string | null; text: string }) {
  return toOwner('other', `Message from the website: ${m.text.slice(0, 40)}${m.text.length > 40 ? '…' : ''}`, {
    kicker: 'Website message', title: `${first(m.name)} sent a message.`, intro: 'Sent from the Contact us form on the Help page. Reply to this email to answer them directly.',
    blocks: [{ kind: 'quote', who: m.name, at: 'just now', text: m.text }, { kind: 'info', rows: [['Email', esc(m.email)], ...(m.phone ? [['Phone', esc(m.phone)] as [string, string]] : [])] }, { kind: 'button', label: 'Open messages', url: desk('#messages') }],
  }, m.email);
}
export async function ownerComplaint(o: Order, text: string) {
  return toOwner('other', `Problem with ${o.id}`, {
    kicker: `Complaint · ${o.id}`, title: `${first(o.name)} reported a problem.`, intro: 'Please sort it within a day.',
    blocks: [{ kind: 'quote', who: o.name, at: 'just now', text }, itemsBlock(o, 'What they ordered'), { kind: 'button', label: 'Open the order', url: desk(`#order=${o.id}`) }],
  }, o.email);
}
export async function ownerDaily(s: { date: string; total: number; orders: number; toPack: number; reviews: number; chats: number; low: string[] }) {
  return toOwner('daily', `Today at Tiada: ${naira(s.total)} from ${s.orders} order${s.orders === 1 ? '' : 's'}`, {
    kicker: s.date, title: `Today: ${naira(s.total)}.`, intro: s.toPack ? 'Here’s what still needs you.' : 'Nothing is waiting on you. Nice.',
    blocks: [{ kind: 'boxes', boxes: [['Paid orders', String(s.orders)], ['To pack', String(s.toPack)], ['Reviews to check', String(s.reviews)]] },
      ...(s.low.length ? [{ kind: 'note', strong: 'Running low:', text: s.low.join(', '), tone: 'gold' } as Block] : []),
      { kind: 'button', label: 'Open today', url: desk() }],
  });
}
export async function ownerLowStock(rows: { name: string; meta: string; waiting: number; img?: string | null }[]) {
  return toOwner('low', `${rows.length} product${rows.length === 1 ? ' is' : 's are'} running low`, {
    kicker: 'Morning stock check', title: 'Time to restock.', intro: 'These are low or sold out this morning.',
    blocks: [{ kind: 'items', title: 'Low or sold out', rows: rows.map(r => ({ name: r.name, meta: r.meta, price: r.waiting ? `${r.waiting} waiting` : '', img: r.img || null })) }, { kind: 'button', label: 'Update stock', url: desk('#products') }],
  });
}

/** Kept for older callers: a short owner alert in the same style. */
export async function alertAdmin(subject: string, html: string) {
  return toOwner('other', subject, { kicker: 'Tiada desk', title: subject, intro: '', blocks: [{ kind: 'text', html }, { kind: 'button', label: 'Open the desk', url: desk() }] });
}
