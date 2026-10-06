# Tiada Marketplace

The live shop (`/`) and the staff admin desk (`/admin`) for Tiada Marketplace, Lagos.

- **Website:** Next.js on Vercel
- **Database and photos:** Supabase
- **Bank-transfer payments:** Paystack "Pay with Transfer". Each order gets its own one-time account, and payment confirms automatically.
- **Emails:** Resend sends sign-in codes and the order placed / on the way / delivered / refund emails.

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
5. **"Pay with Transfer" must be switched on for your account.** If checkout says "We couldn't create your payment account", email support@paystack.com and ask them to enable Pay with Transfer through the Charge API.

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
2. Add items to the basket, check out, and you'll see a one-time account.
3. In test mode, simulate the transfer. Paystack's test docs ("Pay with Transfer → testing") explain how; you can also mark the test charge as successful from your Paystack test dashboard. The page then turns to "Payment confirmed" by itself.
4. In `/admin`, the order appears with a blinking light. Then:
   - Mark it **Packed**.
   - Mark it **On the way**: choose the partner (Kwik, GIG Go, Gokada, GIG Logistics…) and add the booking number.
   - Mark it **Delivered**: say how you confirmed it.

   Each step emails the customer.

When everything works, switch Paystack to live keys, add your email domain in Resend, and you're open.

---

## How things work

- **Prices are checked on the server.** The basket only sends product, size and quantity. The total, delivery fee (area plus kg) and vouchers are worked out on the server, so nobody can change a price in their browser.
- **Payments:**
  - Paystack calls `/api/paystack/webhook` the moment a transfer lands. The site checks Paystack's signature, then double-checks the payment with Paystack before marking the order paid.
  - "I've made the payment" asks Paystack directly, in case the webhook is slow.
- **Stock:** stock comes off when an order is packed, and goes back if an order is cancelled before it leaves.
- **Security:**
  - Customers sign in with a 6-digit email code.
  - Staff sign in with a password plus an authenticator code. They are locked out for 15 minutes after 5 wrong tries, and the desk locks after 15 idle minutes.
  - Every staff action goes in the activity log.
  - The database is only reachable from the server.
- **Tracking:**
  - The map shows an *estimated* position, because Kwik, GIG and the other partners don't share live GPS. The partner's tracking number is shown to the customer.
  - Tracking without signing in needs the order code plus the last 4 digits of the phone, and is locked after 10 wrong tries.

## Changing the design

The screens are built from `frontend/shop_src.html` and `frontend/admin_src.html`. `frontend/live_shop.js` and `frontend/live_admin.js` connect them to the server. After editing them, run:

```
npm run pages      # rebuilds public/shop.html and public/admin.html
npm run typecheck
```

Local development: copy `.env.example` to `.env.local`, fill it in, then run `npm install` and `npm run dev`.
