# Tiada Marketplace

The live shop (`/`) and the staff admin desk (`/admin`) for Tiada Marketplace, Lagos.

- **Website:** Next.js on Vercel
- **Database and photos:** Supabase
- **Payments:** Paystack's own secure window (card, bank transfer, USSD). Payment confirms automatically.
- **Emails:** Resend sends sign-in codes, order emails (confirmed, packed, on the way, delivered, problems, refunds), back-in-stock and newsletter emails, and owner alerts.

You need four free accounts: **GitHub, Vercel, Supabase, Paystack, Resend** (five, counting GitHub). Setup takes about 45 minutes.

---

## 1. Supabase (database)

1. Go to supabase.com → **New project**.
   - Name: `tiada`
   - Region: **West EU (London)** or the closest one offered
   - Save the database password somewhere safe.
2. Open **SQL Editor → New query**. Paste everything in `supabase/schema.sql` and press **Run**.
3. Open a new query, paste `supabase/seed.sql` and press **Run**. This loads your products, combos, delivery areas and banners.
4. Go to **Project Settings → API** and copy two values:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role** secret key → this is `SUPABASE_SERVICE_ROLE_KEY`. Never share it or paste it into a chat.

## 2. Paystack (payments)

1. Sign up at paystack.com as a Nigerian business.
2. Go to **Settings → API Keys & Webhooks** and copy the **Test Secret Key** (`sk_test_…`). This is `PAYSTACK_SECRET_KEY`.
3. In the same page, set **Test Webhook URL** to:
   `https://YOUR-SITE.vercel.app/api/paystack/webhook`
   (Fill this in after step 4, once you know your Vercel link.)
4. Once Paystack verifies your business:
   - Switch to the **Live Secret Key** (`sk_live_…`).
   - Set the **Live Webhook URL** to the same address.
5. Under **Settings → Preferences**, make sure **Card, Bank Transfer and USSD** are switched on. Customers choose one of these in Paystack's window.

> **Refunds:** refunds go out from the admin desk through Paystack. For bank-transfer payments, Paystack sometimes needs the customer's account number. If so, it shows the refund as "Needs attention" in your Paystack dashboard.

## 3. Resend (emails)

1. Sign up at resend.com → **API Keys → Create** and copy the key (`re_…`). This is `RESEND_API_KEY`.
2. **Important:** until you add your own domain, Resend only delivers to **your own** email address. That's fine for testing. Before real customers order:
   - Buy a domain (for example `tiadamarketplace.com`).
   - In Resend go to **Domains → Add**, then add the DNS records it shows at your domain provider.
   - In Vercel, set `EMAIL_FROM` to `Tiada Marketplace <orders@tiadamarketplace.com>`.

## 4. GitHub + Vercel (the website)

1. Create a new **private** repository on GitHub called `tiada-marketplace`.
2. Unzip this project and upload the files with **Add file → Upload files**.
   - Drag in everything inside the folder.
   - Leave out `node_modules` and `.env` if you have them.
3. Go to vercel.com → **Add New → Project**, import `tiada-marketplace`, and keep the default settings.
4. Before you press Deploy, open **Environment Variables** and add these:

| Name | Value |
|---|---|
| `SUPABASE_URL` | from step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
| `PAYSTACK_SECRET_KEY` | from step 2 |
| `RESEND_API_KEY` | from step 3 |
| `EMAIL_FROM` | `Tiada Marketplace <onboarding@resend.dev>` for now |
| `ADMIN_ALERT_EMAIL` | the email that should get "new paid order" alerts |
| `SITE_URL` | your Vercel link, e.g. `https://tiada-marketplace.vercel.app` |
| `SESSION_SECRET` | a long random string (see below) |
| `SETUP_TOKEN` | another long random string (see below) |

**Making a random string:** open https://www.random.org/strings/ and generate 2 strings, each 20 characters long. Join them into one 40-character string. Use a different one for each variable.

5. Press **Deploy**. When it finishes, go back to Paystack and paste the webhook URL (step 2.3).

## 5. Create the owner account

1. Install **Google Authenticator** (or Microsoft Authenticator) on the owner's phone.
2. Open `https://YOUR-SITE.vercel.app/admin`. Because there are no staff yet, it shows **Set up the owner account**.
3. Enter your name, email, a password (10+ characters) and the `SETUP_TOKEN`.
4. Scan the QR code with the authenticator app, then type the 6-digit code. The desk opens.
5. Add your team under **Security & activity → Add a staff member**:
   - **Staff**: orders, stock and flash sales.
   - **Support**: live chat and reviews only. They don't see customer addresses.
   - **Owner**: everything, including refunds and store layout.

   The desk shows their password and QR code once. Hand these over in person.

## 6. Test it end to end (test mode)

1. Open the shop and sign in with **your own** email (Resend test mode only emails you).
2. Add items to the cart and check out. Paystack's window opens.
3. In test mode, pay with Paystack's test card (shown in Paystack's test docs). The page then turns to "Thank you" by itself.
4. In `/admin`, the order appears with a chime. Then:
   - Mark it **Packed**.
   - **Send it out**: the rider's name and phone, or the courier and tracking number.
   - **Mark delivered**: say how it was delivered.

   Each step emails the customer.

When everything works, switch Paystack to live keys, add your email domain in Resend, and you're open.

---

## Upgrading to the November 2026 redesign

Do these once, in this order, before the new version goes live:

1. **Database:** Supabase → SQL Editor → New query → paste all of `supabase/migrations/2026-11-redesign.sql` → Run. It adds stock for each size, discount codes, "tell me when it's back", the newsletter list, website messages, and the new banner settings. It's safe to run twice.
2. **Vercel → Settings → Environment Variables**, add:
   - `CRON_SECRET`: any long random string. Vercel uses it to run the 8pm summary email (`vercel.json`).
   - Check `SITE_URL` is your real address, e.g. `https://tiadamarketplace.com` (payment and email links use it).
   - Check `ADMIN_ALERT_EMAIL`, or set "Send alerts to" in Admin → Shop settings.
3. **Paystack → Settings → Preferences:** switch on Card, Bank Transfer and USSD. The webhook URL stays `https://YOUR-SITE/api/paystack/webhook`.
4. Open `/admin`, check **Products** (stock for each size), **Delivery** and **Shop settings**, then place one test order.

## How things work

- **Prices are checked on the server.** The cart only sends product, size and quantity. The total, delivery fee (area plus kg), stock and discount codes are worked out on the server, so nobody can change a price in their browser.
- **Payments:**
  - Checkout makes a pending order, then opens Paystack's window for exactly that total. If the window can't load, the customer is sent to Paystack's own payment page instead.
  - Paystack calls `/api/paystack/webhook` when a payment succeeds. The site checks Paystack's signature, then double-checks the payment with Paystack before marking the order paid.
  - The order page also asks Paystack directly every few seconds, in case the webhook is slow.
  - Orders left unpaid for an hour are closed by the evening job, and the customer gets one "your basket is still here" email.
- **Stock:** each size has its own stock. It comes off when an order is packed and goes back if an order is cancelled before it leaves. Adding stock to a sold-out size emails everyone who asked to be told.
- **Security:**
  - Customers sign in with a 6-digit email code.
  - Staff sign in with a password plus an authenticator code. They are locked out for 15 minutes after 5 wrong tries, and the desk locks after 15 idle minutes.
  - Every staff action goes in the activity log.
  - The database is only reachable from the server.
- **Tracking:** tracking without signing in needs the order code plus the last 4 digits of the phone, and is locked after 10 wrong tries. The courier's tracking number or the rider's name is shown once it's on the way.

## Changing the design

- Shop pages: `app/(shop)/` and `components/shop/`. Admin desk: `app/admin/` and `components/admin/`. Emails: `lib/email.ts` (the style) and `lib/notify.ts` (the words).
- Colours: green `#0B3A23`, gold `#D49B41`, cream `#FBF9F4`. Fonts (Montserrat and Playfair Display italic) are bundled in `app/fonts/`.

Local development: copy `.env.example` to `.env.local`, fill it in, then run `npm install` and `npm run dev`. To look at the shop without a database, point `TIADA_MOCK` at a JSON file shaped like `lib/storefront.ts`'s `Storefront`.

```
npm run typecheck
npm run build
```
