import { db } from './db';
import { getSetting } from './catalog';
import { getStorefront } from './storefront';
import { AISLE_COPY } from './aisles';

/**
 * The website chat helper. With ANTHROPIC_API_KEY set in Vercel it talks naturally (Claude), using only the
 * shop's own facts below. Without a key, or if the AI is down, a simpler keyword helper answers instead.
 * Either way it hands the chat to the team when it can't help, or when the customer asks for a person.
 */
export type Turn = { who: string; text: string };
export type BotAnswer = { text: string; handoff: boolean };

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
const HANDOFF = '[[HANDOFF]]';

/** Everything the helper may say about the shop, written out as plain facts. */
async function shopFacts() {
  const [sf, hours] = await Promise.all([getStorefront(), getSetting<[string, boolean, string, string][]>('hours', [])]);
  const byAisle = new Map<string, string[]>();
  for (const p of sf.products) {
    const sizes = p.sizes.filter(s => !s.na && s.price);
    if (!sizes.length) continue;
    const price = (s: (typeof sizes)[number]) => (s.sale && s.sale < (s.price || 0) ? `${naira(s.sale)} (sale, was ${naira(s.price || 0)})` : naira(s.price || 0));
    const sold = (s: (typeof sizes)[number]) => (s.left === 0 || p.status === 'out' ? ' – sold out' : '');
    const line = p.items?.length
      ? `${p.name}: ${price(sizes[0])}${sold(sizes[0])}. Inside: ${p.items.join(', ')}.`
      : `${p.name}: ${sizes.map(s => `${s.label} ${price(s)}${sold(s)}`).join(' · ')}`;
    const a = AISLE_COPY[p.cat]?.[0] || p.cat;
    byAisle.set(a, (byAisle.get(a) || []).concat(line));
  }
  const catalog = [...byAisle].map(([a, l]) => `${a}:\n- ${l.join('\n- ')}`).join('\n');
  const delivery = sf.zones.map(z => `${z.state === 'Lagos' ? 'Lagos' : z.state + ' State'}: fee ${naira(z.fee)} to ${naira(z.max)} depending on distance, usually arrives ${z.days}`).join('\n');
  const open = hours.length ? hours.map(([d, on, a, b]) => `${d}: ${on ? `${a}–${b}` : 'closed'}`).join(', ') : 'not set';
  const b = sf.business;
  return `SHOP: ${b.name} ("${b.tagline}"), an online foodstuff and cereal shop in Nigeria. Website tiadamarketplace.com. WhatsApp/phone ${b.phone}. Email ${b.email}. TikTok @${b.tiktok}.
HOW IT WORKS: We buy cereals, milk and foodstuffs in large original packs and repack them by weight into sealed, labelled Tiada bags (250g, 500g, 1kg or a "paint" bucket), so people buy only what they need. Tins and sealed packs stay sealed. Combos are ready-made bundles at one price; on any combo the customer can tap "Swap items" and change items they don't want for others of similar value; the price stays the same.
ORDERING: Add to cart, check out, type the delivery address and pick it from the suggestions; the delivery fee shows before paying. Smallest order ${naira(sf.fees.min)}. Pay online through Paystack by card, bank transfer or USSD. No cash on delivery. Accounts use a 6-digit code sent by email, no password. After paying, the customer gets an email with the order code (TD-xxxxx) and a 4-digit delivery code to give the rider at the door.
DELIVERY (only Lagos and Oyo State for now; Oyo orders go out from our Iseyin branch):
${delivery}
Priority delivery: +${naira(sf.fees.same)}, same day or next morning where possible. Orders over 5 kg cost a little more; over 20 kg need a van.
TRACKING: on tiadamarketplace.com/track with the order code, or in My account when signed in. Customers get emails when the order is packed, on the way (with rider's name and phone) and delivered.
RETURNS: ${sf.policies.returns || 'Message us within 24 hours with a photo if something is missing or damaged, and we will replace it or refund.'}
OPENING HOURS (team replies): ${open}.
PRODUCTS AND PRICES:
${catalog}`;
}

/** If the customer gives an order code, look it up and describe it (never the address, phone, email or delivery code). */
async function orderFacts(text: string) {
  const m = /\bTD-?\s?(\d{5,9})\b/i.exec(text);
  if (!m) return '';
  const id = 'TD-' + m[1];
  const o = (await db().from('orders').select('id,status,created_at,area_label,items,rider,issue,speed_label').eq('id', id).maybeSingle()).data as
    { id: string; status: string; created_at: string; area_label: string | null; items: { name: string; size: string; qty: number }[]; rider: { driver?: string; partner?: string } | null; issue: { reason?: string; eta?: string } | null; speed_label: string | null } | null;
  if (!o) return `ORDER LOOKUP: no order found with code ${id}.`;
  const word: Record<string, string> = { pending: 'not paid yet', expired: 'never paid (expired)', new: 'paid, being packed', packed: 'packed and sealed, waiting to go out', route: 'on the way', done: 'delivered', issue: 'delayed by a problem', refunded: 'refunded', cancelled: 'cancelled' };
  return `ORDER LOOKUP for ${o.id}: status ${word[o.status] || o.status}; placed ${new Date(o.created_at).toDateString()}; delivering to ${o.area_label || 'their address'} (${o.speed_label || 'standard'}); items ${o.items.map(i => `${i.qty} × ${i.name}${i.size !== 'Package' ? ' ' + i.size : ''}`).join(', ')}${o.status === 'route' && o.rider?.driver ? `; rider ${o.rider.driver.split(' ')[0]}` : ''}${o.status === 'issue' && o.issue?.reason ? `; problem: ${o.issue.reason}${o.issue.eta ? ', new date ' + o.issue.eta : ''}` : ''}.`;
}

const RULES = `You are the friendly chat helper on the Tiada Marketplace website. Talk like a warm, polite Nigerian shop assistant: simple clear English, short answers (2–4 sentences, under 80 words), no jargon, at most one emoji. Greet people kindly when they greet you.
Only use the facts below. Never invent prices, products, sizes, discounts, delivery times or policies. If something isn't in the facts, say you're not sure and offer to bring in the team.
Never ask for card numbers, PINs, OTPs or passwords. Never reveal or guess a delivery code. Only talk about Tiada and shopping with Tiada; politely steer other topics back.
When you suggest a product, give its price. When it helps, point to the right page: tiadamarketplace.com/track, /help, /account, or an aisle.
Hand the chat to a person when: the customer asks for a person, a payment went wrong or was charged but no order, an order is late, missing, damaged or wrong, they want a refund, cancellation or an address change, they are upset, or you can't answer after trying. To hand over, reply with one short sentence saying a team member will join this chat shortly, and put ${HANDOFF} at the very end.`;

export async function botReply(history: Turn[], text: string): Promise<BotAnswer> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try { return await aiReply(key, history, text); } catch (e) { console.error('chat ai', (e as Error).message); }
  }
  return ruleReply(text);
}

async function aiReply(key: string, history: Turn[], text: string): Promise<BotAnswer> {
  const [facts, order] = await Promise.all([shopFacts(), orderFacts(text)]);
  // the conversation so far, as alternating turns starting with the customer
  const msgs: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const t of history.slice(-14).concat({ who: 'me', text })) {
    if (t.who === 'sys') continue;
    const role = t.who === 'me' ? 'user' : 'assistant';
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content += '\n' + t.text; else msgs.push({ role, content: t.text.slice(0, 1500) });
  }
  while (msgs.length && msgs[0].role === 'assistant') msgs.shift();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 400, system: `${RULES}\n\nFACTS:\n${facts}${order ? '\n' + order : ''}\nToday is ${new Date().toDateString()}.`, messages: msgs }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json() as { content?: { type: string; text?: string }[] };
  let out = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
  const handoff = out.includes(HANDOFF);
  out = out.replace(HANDOFF, '').trim();
  return { text: out || 'Let me bring in the team to help with that.', handoff: handoff || !out };
}

/** The free helper: understands common questions from keywords. */
async function ruleReply(text: string): Promise<BotAnswer> {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some(x => t.includes(x));
  if (has('person', 'human', 'agent', 'someone', 'customer care', 'customer service', 'call me')) return { text: 'Okay, I’ve asked the team to join this chat. Someone will reply here shortly.', handoff: true };
  if (has('refund', 'cancel', 'damaged', 'missing', 'wrong item', 'charged', 'debited', 'complain', 'not delivered', 'late')) return { text: 'I’m sorry about that. I’ve asked the team to look into it; someone will reply here shortly.', handoff: true };
  const order = await orderFacts(text);
  if (order) return { text: order.replace(/^ORDER LOOKUP( for)? /, 'Order ').replace(/; /g, '. ') + ' Anything else I can help with?', handoff: false };
  if (has('track', 'where is my order', 'my order', 'status')) return { text: 'Send me your order code (it starts with TD-) and I’ll check it. You can also track it at tiadamarketplace.com/track.', handoff: false };
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|howdy|yo)\b/.test(t.trim())) return { text: 'Hello! 👋 Welcome to Tiada. I can help with prices, delivery, your order or combos. What would you like to know?', handoff: false };
  const sf = await getStorefront();
  const hit = sf.products.filter(p => p.name.toLowerCase().split(/\s+/).some(w => w.length > 3 && t.includes(w)));
  if (hit.length) {
    return { text: hit.slice(0, 3).map(p => { const s = p.sizes.filter(x => !x.na && x.price); return s.length ? `${p.name}: ${s.map(x => `${x.label === 'Package' ? '' : x.label + ' '}${naira(x.sale && x.sale < (x.price || 0) ? x.sale : x.price || 0)}`).join(', ')}` : `${p.name}: not available right now`; }).join('\n') + '\nYou can order on the website any time.', handoff: false };
  }
  if (has('deliver', 'delivery', 'shipping', 'fee', 'lagos', 'oyo', 'ibadan', 'iseyin', 'abuja', 'state')) return { text: `We deliver in ${sf.zones.map(z => z.state).join(' and ')} State. The fee depends on distance and shows at checkout once you type your address, before you pay. Lagos usually arrives the next day; Oyo in 1–3 days.`, handoff: false };
  if (has('pay', 'payment', 'transfer', 'card', 'ussd', 'cash')) return { text: 'You pay online through Paystack by card, bank transfer or USSD. We don’t take cash on delivery.', handoff: false };
  if (has('swap', 'change item', 'combo')) return { text: 'On any combo, tap “Swap items” and change what you don’t want for something similar. The price stays the same.', handoff: false };
  if (has('code', 'delivery code', 'rider')) return { text: 'Your 4-digit delivery code is in your order email and in My account. Give it to our rider at the door once you have your order.', handoff: false };
  if (has('repack', 'bag', 'original', 'sealed')) return { text: 'We buy in big original packs and repack by weight into sealed Tiada bags, so you can buy just 250g, 500g or 1kg. Tins and sealed packs stay sealed.', handoff: false };
  if (has('thank')) return { text: 'You’re welcome! Anything else I can help with?', handoff: false };
  return { text: 'I’m not sure I understood. I can help with prices, delivery fees, tracking an order or combos. Or tap “Talk to a person” and the team will reply here.', handoff: false };
}
