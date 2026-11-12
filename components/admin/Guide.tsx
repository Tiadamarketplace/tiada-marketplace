'use client';
import type { Ctx } from './Desk';
import type { Sec } from './types';
import { Btn, card } from './ui';

type Part = { id: string; title: string; open?: Sec; intro: string; steps: [string, string][] };

/** "How to use" for the Admin desk: every page, step by step, in plain words. */
const PARTS: Part[] = [
  {
    id: 'start', title: 'Start here: your daily routine', open: 'dash',
    intro: 'Most days you only need Today and Orders. Everything else is for when you want to change the shop.',
    steps: [
      ['Open Today first', 'It shows new orders waiting to be packed, orders going out, anything with a problem, and products running low. The bell at the top lights up when something needs you.'],
      ['Pack, then send, then deliver', 'Work through new orders in Orders. Each step you press emails the customer, so they always know where their order is.'],
      ['Answer customers', 'Check Chat and Website messages once or twice a day. Customers who asked for a person are waiting there.'],
      ['Restock', 'When something runs low, open Products and press + on that size. People waiting for it get an email automatically.'],
      ['Quick tools', 'Press “/” anywhere to search orders, products and customers. “+ New” at the top adds a product, banner or discount code. After 15 minutes without use the desk locks itself for safety; just sign in again.'],
    ],
  },
  {
    id: 'orders', title: 'Orders', open: 'orders',
    intro: 'Every paid order lands here. Tap an order to open it.',
    steps: [
      ['New → Packed', 'Pack the items on the pack list, then press Mark packed. Stock comes off at this point, and the customer gets a “packed” email.'],
      ['Packed → On the way', 'Press Send it out and pick which of your riders is taking it (or type a courier and tracking number). The customer gets the rider’s name and phone by email, plus their 4-digit delivery code.'],
      ['On the way → Delivered by the rider', 'Your rider opens their private link, asks the customer for the delivery code at the door and types it in. The order turns Delivered by itself. Without the right code it can’t be marked delivered.'],
      ['On the way → Delivered', 'Press Mark delivered and say how it was handed over. The customer is emailed and can leave a review.'],
      ['Run sheet', 'For many orders at once, open Run sheet. It lists every drop with addresses and Google Maps links. Copy it into WhatsApp for the rider, and send out or mark delivered the whole run in one tap.'],
      ['Open in Google Maps', 'Every new order has an Open in Google Maps link, from the address the customer picked at checkout.'],
      ['Edit an order', 'Press Edit order to change the name, phone, email, address, items, quantities, prices or delivery fee. No money moves and no email is sent. If the new total is lower, refund the difference; if it is higher, collect it from the customer. The order shows both what they paid and the new total. Delivered orders can’t be edited.'],
      ['Something went wrong', 'Press Report a problem (or Can’t fill it). Pick the reason, add a note and a new date if you have one. The customer is emailed. When it’s fixed, press Problem sorted.'],
      ['Refund or cancel', 'Refund sends money back through Paystack to the card or account they paid with: all of it or part of it. Cancel refunds everything and puts the stock back. Only the owner can refund or cancel.'],
      ['Email the customer', 'Write a message from the order and it goes out in the Tiada email style with the order code.'],
    ],
  },
  {
    id: 'products', title: 'Products and prices', open: 'products',
    intro: 'Everything in the shop. Tap a product to open it and change anything.',
    steps: [
      ['Change a price', 'Open the product. Each size has its own box: type the new price and press Save product. The shop shows it within a minute.'],
      ['Sale price', 'Type a sale price lower than the price. The shop shows the old price crossed out. Empty the sale box to end the sale.'],
      ['Sizes you don’t sell', 'Leave the price empty and that size can’t be bought. Type a price to start selling it.'],
      ['Stock', 'Each size has its own stock. In the list, press + or − to change it straight away, or type the number inside the product. At 0 the size shows as sold out. “Warn me when a size is down to” sets when it shows as low.'],
      ['Show or hide', 'The switch on the right hides a product from the shop without deleting it. Hide things you’ve sold before instead of deleting them.'],
      ['Combos', 'Cereal and foodstuff combos are sold as one package. Set one price and list what’s inside, one item per line.'],
      ['Photos', 'Square, on a white background, works best. Press the photo box to upload; it’s resized for you.'],
      ['Add a product', 'Press + Add product, fill in the name, aisle, sizes and prices, add a photo and save.'],
      ['People waiting', 'A small gold number next to a size means that many people asked to be told when it’s back. Adding stock emails them.'],
    ],
  },
  {
    id: 'riders', title: 'Riders and delivery codes', open: 'riders',
    intro: 'Each rider gets a private page on their phone with their deliveries.',
    steps: [
      ['Add a rider', 'Open Riders, type their name and phone and press Add rider. Then press Send on WhatsApp to give them their link. They don’t need a password.'],
      ['Give them orders', 'When you press Send it out on an order, or Send all out on a run sheet, choose the rider. The orders appear on their page with a Map button, Call and WhatsApp buttons, the items and any note.'],
      ['Delivery codes', 'Every customer gets a 4-digit code by email when they pay, and again when the order is on the way. It’s also on their order page. At the door, the rider types the code and the order is marked delivered.'],
      ['Customer can’t find the code', 'The code is shown on the order in Orders. Call the customer to check it’s really them, then give the rider the code.'],
      ['Rider can’t deliver', 'The rider taps Can’t deliver and picks a reason. You get an email straight away so you can call the customer.'],
      ['Lost phone or rider leaves', 'In Riders, switch them off, or press New link. The old link stops working at once.'],
    ],
  },
  {
    id: 'delivery', title: 'Delivery fees', open: 'delivery',
    intro: 'Customers type their address at checkout and the fee is worked out from how far it is from you.',
    steps: [
      ['Paste your pins', 'In Google Maps, press and hold on your Lagos hub, copy the numbers that appear, and paste them under Lagos. Do the same for your Iseyin branch under Oyo. Customers never see your pins.'],
      ['Set the fee', 'Starting fee + a little for every km, never more than the maximum. The “What customers pay” list shows the fee for well-known places as you type.'],
      ['How far you go', '“Furthest we deliver” stops orders from too far away: those customers see a red note saying you don’t reach their area yet.'],
      ['Usually arrives', 'The words customers see, like “next day” or “1–3 days”.'],
      ['Oyo on or off', 'The switch turns Oyo deliveries on or off. When off, Oyo customers see that you don’t deliver there yet.'],
      ['Extra charges', 'Smallest order, Priority delivery, heavy orders over 5 kg, and a van for orders over 20 kg.'],
    ],
  },
  {
    id: 'sell', title: 'Banners, discount codes, emails and reviews', open: 'banners',
    intro: 'Tools for getting more orders.',
    steps: [
      ['Banners', 'The slides in the middle of the home page. Each needs a wide photo, a title and where it links to. Use the switch to show or hide one, and the arrows to change the order.'],
      ['Discount codes', 'Make a code like FIRST10: a percentage or an amount off, a minimum order, an end date, and whether each customer can use it once. Pause it with the switch.'],
      ['Emails', 'Send news, a deal or a restock note to customers who agreed to get emails. They can unsubscribe from any email. Only the owner can send.'],
      ['Reviews', 'New reviews wait for you. Approve the real ones and they show on the product page.'],
    ],
  },
  {
    id: 'customers', title: 'Chat, messages and customers', open: 'chat',
    intro: 'Where customers talk to you.',
    steps: [
      ['Chat', 'When the website helper can’t answer, customers can ask for a person. Their questions wait here, and you get an email. Reply here and they see it in the chat on the website while it’s open; if they’ve left, reply by email or WhatsApp.'],
      ['Website messages', 'Sent from the Contact us form on the Help page. Reply by email or WhatsApp, then mark it handled.'],
      ['Customers', 'Everyone with an account or an order: their orders, how much they’ve spent, and how to reach them.'],
    ],
  },
  {
    id: 'settings', title: 'Shop settings and your team', open: 'settings',
    intro: 'Set once, change when you need to.',
    steps: [
      ['Business details', 'Your name, WhatsApp number, email and address, shown on the website and in emails.'],
      ['Opening hours', 'Shown on the website so customers know when you reply.'],
      ['Alerts', 'Where your new-order emails and the 7pm daily summary go.'],
      ['Policies', 'Your returns, delivery and privacy wording on the Help page.'],
      ['Team', 'Add people with their own sign-in. Staff can handle orders and products; Support can answer chat and reviews; only the Owner can refund, change settings, send emails to everyone and manage the team. Switch someone off to stop them signing in. Every action is logged with who did it.'],
    ],
  },
  {
    id: 'money', title: 'Payments and money', open: 'orders',
    intro: 'Customers pay through Paystack by card, bank transfer or USSD.',
    steps: [
      ['Where the money goes', 'Paystack pays out to the bank account in your Paystack settings. See payouts in your Paystack dashboard.'],
      ['Live or test', 'At the bottom of the side menu: “Taking real payments” (green) means live. “Paystack test mode” (amber) means no real money is moving.'],
      ['Unpaid orders', 'Orders that weren’t paid don’t show as new orders, and nothing is packed for them.'],
    ],
  },
];

export default function Guide({ c }: { c: Ctx }) {
  const jump = (id: string) => document.getElementById('g-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900 }}>
      <section style={{ ...card, padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B958E', marginBottom: 10 }}>On this page</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PARTS.map(p => <button key={p.id} type="button" className="ub chip" onClick={() => jump(p.id)} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid #DCD6CA', fontSize: 13, fontWeight: 600 }}>{p.title}</button>)}
        </div>
      </section>
      {PARTS.map(p => (
        <section key={p.id} id={'g-' + p.id} style={{ ...card, padding: '20px 22px', scrollMarginTop: 90 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{p.title}</h2>
            {p.open && <Btn kind="text" small onClick={() => c.go(p.open!)}>Open {p.open === 'dash' ? 'Today' : p.title.split(/[ ,]/)[0]} →</Btn>}
          </div>
          <p style={{ margin: '6px 0 12px', fontSize: 14, color: '#4D5A52', lineHeight: 1.6 }}>{p.intro}</p>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
            {p.steps.map(([t, x], i) => (
              <li key={t} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 12, padding: '12px 0', borderTop: '1px solid #F0ECE3' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#E6EEE8', color: '#0B3A23', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <span style={{ fontSize: 14, lineHeight: 1.6 }}><strong style={{ fontWeight: 600 }}>{t}.</strong> <span style={{ color: '#4D5A52' }}>{x}</span></span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <p style={{ margin: 0, fontSize: 13, color: '#66736B' }}>Stuck on something not covered here? Message Claude with a screenshot.</p>
    </div>
  );
}
