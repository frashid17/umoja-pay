# Umoja Pay

Payments aggregator for East Africa — M-Pesa-shaped API, merchant KYC, API keys, docs, and a platform admin console.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Clerk (Auth) + Supabase (Postgres, Storage, RLS)

## Setup

1. Create a [Supabase](https://supabase.com) project (database + storage only).
2. Run [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) in the SQL editor.
   - If you already ran an older `001` with Supabase Auth UUIDs, also run [`002_clerk_user_ids.sql`](supabase/migrations/002_clerk_user_ids.sql).
3. Create a [Clerk](https://dashboard.clerk.com) application and copy keys into `.env.local`
   (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), or run:
   `npx clerk auth login && npx clerk link && npx clerk env pull`
4. Copy remaining values from `.env.example` (Supabase URL/keys, `PLATFORM_ADMIN_EMAILS`).
5. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Merchant flow

1. Sign up with Clerk → `/onboarding` creates your merchant as `draft`
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

- `src/app/api/v1` — public Payments API
- `src/app/dashboard` — merchant console
- `src/app/admin` — platform admin
- `src/lib/payments` — payment service + sandbox adapter
- `openapi/umoja.yaml` — API contract
- `BUILD_PLAN.md` — roadmap
