# Umoja Pay

Payments aggregator for East Africa: M-Pesa-shaped API, merchant KYC, API keys, docs, and a platform admin console.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Neon Auth (Managed Better Auth) + Neon Postgres. Uploaded files are stored in Postgres and served by the app.

## Setup

1. Create a [Neon](https://neon.tech) project. Copy the pooled connection string into `DATABASE_URL`.
2. In the Neon Console, open **Auth** → enable Managed Better Auth, then copy the Auth URL into
   `NEON_AUTH_BASE_URL`. Generate `NEON_AUTH_COOKIE_SECRET` with `openssl rand -base64 32`.
3. Install dependencies, then apply the schema:

```bash
npm install
npm run db:migrate
```

4. Copy remaining values from `.env.example` (`PLATFORM_ADMIN_EMAILS`, Paystack keys).
5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Merchant flow

1. Sign up on the platform → `/onboarding` creates your merchant as `draft`
2. Dashboard → KYC → submit documents → `pending_kyc`
3. Admin (email in `PLATFORM_ADMIN_EMAILS`) approves → `active`
4. Create `uk_test_…` key → call `/api/v1/payments`

## API quick start

```bash
curl -X POST "http://localhost:3000/api/v1/payments" \
  -H "Authorization: Bearer uk_test_…" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-1" \
  -d '{"amount":15000,"currency":"KES","phone":"254712345678"}'
```

Docs: [/docs](http://localhost:3000/docs)

## Project layout

- `src/app/api/v1`: public Payments API
- `src/app/dashboard`: merchant console
- `src/app/admin`: platform admin
- `src/lib/payments`: payment service + sandbox adapter
- `openapi/umoja.yaml`: API contract
- `BUILD_PLAN.md`: roadmap
