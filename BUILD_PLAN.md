# Umoja — BUILD_PLAN

## Shipped (MVP)

- Next.js App Router + Supabase Auth / Postgres / Storage / RLS
- Merchant signup, business create, KYC submit + document upload
- API key generate / revoke (hashed secrets, test + live gating)
- Public Payments API: create, get, list + idempotency + light rate limit
- Sandbox M-Pesa STK adapter (phone suffix / header outcome)
- Signed webhooks (single retry) + audit logs
- OpenAPI docs at `/docs`
- Platform admin: overview, merchants, KYC queue, payments
- Merchant settings (profile, settlement destination, team) + settlements dashboard

## Next

1. **Live Safaricom Daraja** — implement `DarajaMpesaAdapter` behind the same interface; store short-code / passkey per merchant.
2. **Refunds** — `POST /api/v1/refunds` + dashboard UI.
3. **Payouts / settlements** — dashboard settlements page + settlement destination in settings shipped; automate batch creation and bank/MM rails next.
4. **Hosted Checkout** — redirect / embed page so merchants avoid collecting phones in their own UI if preferred.
5. **Customer objects** — reusable payers, saved MSISDNs.
6. **Webhook delivery queue** — durable retries with backoff and delivery logs.
7. **SDKs** — Node and Python thin clients generated from OpenAPI.
8. **Compliance** — production KYC vendor integration, transaction monitoring hooks, PCI minimization (mobile-money-first).

## Ops checklist

- Create Supabase project; run `supabase/migrations/001_init.sql` then `002_clerk_user_ids.sql` and `003_settlements.sql`
- Set env from `.env.example`
- Add your email to `PLATFORM_ADMIN_EMAILS`
- Confirm Storage bucket `kyc` is private
