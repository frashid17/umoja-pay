# Umoja — BUILD_PLAN

## Shipped (MVP)

- Next.js App Router + Clerk Auth / Supabase Postgres / Storage / RLS
- Merchant signup, business create, KYC submit + document upload
- API key generate / revoke (hashed secrets, test + live gating)
- Public Payments API: create, get, list + idempotency + light rate limit
- Sandbox M-Pesa STK + sandbox card adapters
- Hosted Checkout (`/checkout/[id]`) with merchant logo, brand accent, MoMo + card
- Merchant Checkout dashboard (branding, preview, test links) + admin checkout preview
- Payment links (`/dashboard/payment-links`, `/pay/[slug]`) with product image, QR, PNG/PDF flyer, powered-by footer
- Signed webhooks (single retry) + audit logs
- OpenAPI docs at `/docs`
- Platform admin: overview, merchants, KYC queue, payments
- Merchant settings (profile, settlement destination, team) + settlements dashboard
- Merchant balances, transactions ledger, and customers (payers from payments)
- Refunds (full/partial) via dashboard + `POST /api/v1/refunds`; settles to original MoMo/card; merchant can edit reason/amount

## Next

1. **Live Safaricom Daraja** — implement `DarajaMpesaAdapter` behind the same interface; store short-code / passkey per merchant.
2. **Live card acquiring** — replace sandbox card with a PCI-compliant processor (tokens only; never store PAN).
3. **Payouts / settlements** — automate batch creation and bank/MM rails.
4. **Checkout API** — `POST /api/v1/checkout/sessions` for programmatic hosted payment links.
5. **Customer objects** — reusable payers, saved MSISDNs.
6. **Webhook delivery queue** — durable retries with backoff and delivery logs.
7. **SDKs** — Node and Python thin clients generated from OpenAPI.
8. **Compliance** — production KYC vendor integration, transaction monitoring hooks.

## Ops checklist

- Create Supabase project; run migrations `001` → `006_refunds.sql`
- Set env from `.env.example`
- Add your email to `PLATFORM_ADMIN_EMAILS`
- Confirm Storage buckets: `kyc` (private), `merchant-logos` (public), `payment-link-images` (public)
