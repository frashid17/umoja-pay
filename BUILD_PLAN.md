# Umoja: BUILD_PLAN

## Shipped (MVP)

- Next.js App Router + Neon Auth / Neon Postgres / stored_objects file storage
- Merchant signup, business create, KYC submit + document upload
- API key generate / revoke (hashed secrets, test + live gating)
- Public Payments API: create, get, list + idempotency + light rate limit
- Sandbox M-Pesa STK + sandbox card adapters
- **Paystack** (test/live keys): M-Pesa Charge API + card Popup/redirect; webhook `/api/webhooks/paystack`
- Hosted Checkout (`/checkout/[id]`) with merchant logo, brand accent, MoMo + card
- Merchant Checkout dashboard (branding, preview, test links) + admin checkout preview
- Payment links (`/dashboard/payment-links`, `/pay/[slug]`) with product image, QR, PNG/PDF flyer, powered-by footer
- Products catalog (`/dashboard/products`, `/p/[slug]`) with multi-price intervals (one-time, daily, weekly, monthly, yearly), fulfillment + stock options
- Invoices (`/dashboard/invoices`, `/invoice/[slug]`) with line items, due dates, and hosted checkout pay links
- Signed webhooks (single retry) + audit logs
- OpenAPI docs at `/docs`
- Platform admin: overview, merchants, KYC queue, payments
- Merchant settings (profile, settlement destination, team) + settlements dashboard
- Merchant balances, transactions ledger, and customers (payers from payments)
- Refunds (full/partial) via dashboard + `POST /api/v1/refunds`; settles to original MoMo/card; merchant can edit reason/amount

## Next

1. **Live Paystack**: enable M-Pesa on Paystack dashboard; add live keys; set webhook URL.
2. **Live Safaricom Daraja** (optional): only if you need native paybill/till outside Paystack.
3. **Payouts / settlements**: automate batch creation and bank/MM rails.
4. **Checkout API**: `POST /api/v1/checkout/sessions` for programmatic hosted payment links.
5. **Customer objects**: reusable payers, saved MSISDNs.
6. **Webhook delivery queue**: durable retries with backoff and delivery logs.
7. **SDKs**: Node and Python thin clients generated from OpenAPI.
8. **Compliance**: production KYC vendor integration, transaction monitoring hooks.

## Ops checklist

- Create a Neon project; set `DATABASE_URL`; run `npm run db:migrate` (`db/schema.sql`)
- Products: paste `db/products.sql` in the Neon SQL Editor (or `npm run db:migrate` applies `db/migrations/002_products.sql`)
- Invoices: paste `db/invoices.sql` in the Neon SQL Editor (or `npm run db:migrate` applies `db/migrations/003_invoices.sql`)
- Enable Neon Auth in the console; set `NEON_AUTH_BASE_URL` + `NEON_AUTH_COOKIE_SECRET`
- Set remaining env from `.env.example` (include Paystack test keys)
- Paystack Dashboard → Settings → API Keys & Webhooks → URL `https://YOUR_DOMAIN/api/webhooks/paystack`
- Enable Mobile Money / M-Pesa for Kenya on Paystack Preferences
- Add your email to `PLATFORM_ADMIN_EMAILS`
