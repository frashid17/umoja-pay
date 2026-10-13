-- Umoja schema for Neon Postgres.
-- Auth is Neon Auth (Managed Better Auth). Users live in Neon's auth schema;
-- app tables below store merchant/payment data only.
-- current_app_user_id() reads the session setting app.user_id so RLS policies
-- can tell tenants apart. The app connects as the database owner, which
-- bypasses RLS the same way the old Supabase service role did. Every tenant
-- query in the app is still scoped to the signed-in merchant.

create extension if not exists pgcrypto;

create type merchant_status as enum ('draft', 'pending_kyc', 'active', 'rejected', 'suspended');
create type member_role as enum ('owner', 'developer');
create type kyc_status as enum ('draft', 'pending', 'approved', 'rejected');
create type api_key_mode as enum ('test', 'live');
create type payment_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'partially_refunded',
  'refunded'
);
create type payment_method as enum ('mpesa_stk', 'card');
create type currency_code as enum ('KES', 'TZS', 'UGX', 'RWF');
create type country_code as enum ('KE', 'TZ', 'UG', 'RW');
create type settlement_status as enum ('pending', 'processing', 'paid', 'failed');
create type checkout_session_status as enum ('open', 'completed', 'expired', 'canceled');
create type payment_link_status as enum ('active', 'archived');
create type refund_status as enum ('pending', 'processing', 'succeeded', 'failed', 'canceled');

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  country country_code not null default 'KE',
  status merchant_status not null default 'draft',
  website text,
  support_email text,
  support_phone text,
  statement_email text,
  logo_path text,
  brand_accent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchant_members (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  user_id text not null,
  role member_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (merchant_id, user_id)
);

create index merchant_members_user_id_idx on public.merchant_members (user_id);

create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  legal_name text not null,
  registration_number text not null,
  address_line text not null,
  city text not null,
  country country_code not null,
  directors_summary text not null,
  status kyc_status not null default 'pending',
  review_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  submitted_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kyc_submissions_merchant_id_idx on public.kyc_submissions (merchant_id);
create index kyc_submissions_status_idx on public.kyc_submissions (status);

create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  submission_id uuid not null references public.kyc_submissions (id) on delete cascade,
  doc_type text not null,
  file_path text not null,
  file_name text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create index kyc_documents_submission_id_idx on public.kyc_documents (submission_id);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  prefix text not null unique,
  secret_hash text not null,
  mode api_key_mode not null default 'test',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create index api_keys_merchant_id_idx on public.api_keys (merchant_id);
create index api_keys_prefix_idx on public.api_keys (prefix);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  amount integer not null check (amount > 0),
  currency currency_code not null,
  method payment_method not null default 'mpesa_stk',
  phone text,
  status payment_status not null default 'pending',
  mode api_key_mode not null default 'test',
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  provider_ref text,
  failure_reason text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);

create index payments_merchant_id_idx on public.payments (merchant_id);
create index payments_status_idx on public.payments (status);
create index payments_created_at_idx on public.payments (created_at desc);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  url text not null,
  mode api_key_mode not null default 'test',
  signing_secret text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (merchant_id, mode)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants (id) on delete set null,
  actor_user_id text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index audit_logs_merchant_id_idx on public.audit_logs (merchant_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create table public.platform_admins (
  user_id text primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table public.settlement_accounts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  account_name text not null,
  bank_name text not null,
  account_number text not null,
  branch_code text,
  mobile_money_phone text,
  currency currency_code not null default 'KES',
  country country_code not null default 'KE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  amount integer not null check (amount > 0),
  currency currency_code not null,
  status settlement_status not null default 'pending',
  period_start date not null,
  period_end date not null,
  destination_label text,
  reference text,
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index settlements_merchant_id_idx on public.settlements (merchant_id);
create index settlements_status_idx on public.settlements (status);
create index settlements_created_at_idx on public.settlements (created_at desc);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  amount integer not null check (amount > 0),
  currency currency_code not null default 'KES',
  description text,
  reference text,
  status checkout_session_status not null default 'open',
  mode api_key_mode not null default 'test',
  is_preview boolean not null default false,
  payment_id uuid references public.payments (id) on delete set null,
  success_url text,
  cancel_url text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checkout_sessions_merchant_id_idx on public.checkout_sessions (merchant_id);
create index checkout_sessions_status_idx on public.checkout_sessions (status);
create index checkout_sessions_created_at_idx on public.checkout_sessions (created_at desc);

create table public.payment_links (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  slug text not null unique,
  product_name text not null,
  description text,
  amount integer not null check (amount > 0),
  currency currency_code not null default 'KES',
  image_path text,
  mode api_key_mode not null default 'test',
  status payment_link_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_links_merchant_id_idx on public.payment_links (merchant_id);
create index payment_links_status_idx on public.payment_links (status);
create index payment_links_created_at_idx on public.payment_links (created_at desc);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  payment_id uuid not null references public.payments (id) on delete restrict,
  amount integer not null check (amount > 0),
  currency currency_code not null,
  method payment_method not null,
  status refund_status not null default 'pending',
  mode api_key_mode not null default 'test',
  reason text,
  provider_ref text,
  failure_reason text,
  created_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index refunds_merchant_id_idx on public.refunds (merchant_id);
create index refunds_payment_id_idx on public.refunds (payment_id);
create index refunds_status_idx on public.refunds (status);
create index refunds_created_at_idx on public.refunds (created_at desc);

-- File bytes that used to live in Supabase Storage (KYC, logos, product images).
create table public.stored_objects (
  bucket text not null,
  path text not null,
  content_type text,
  data text not null,
  created_at timestamptz not null default now(),
  primary key (bucket, path)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger merchants_updated_at
  before update on public.merchants
  for each row execute function public.set_updated_at();

create trigger kyc_submissions_updated_at
  before update on public.kyc_submissions
  for each row execute function public.set_updated_at();

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger settlement_accounts_updated_at
  before update on public.settlement_accounts
  for each row execute function public.set_updated_at();

create trigger settlements_updated_at
  before update on public.settlements
  for each row execute function public.set_updated_at();

create trigger checkout_sessions_updated_at
  before update on public.checkout_sessions
  for each row execute function public.set_updated_at();

create trigger payment_links_updated_at
  before update on public.payment_links
  for each row execute function public.set_updated_at();

create trigger refunds_updated_at
  before update on public.refunds
  for each row execute function public.set_updated_at();

create or replace function public.current_app_user_id()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.user_id', true), ''), '');
$$;

create or replace function public.is_merchant_member(p_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.merchant_members m
    where m.merchant_id = p_merchant_id
      and m.user_id = public.current_app_user_id()
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins a
    where a.user_id = public.current_app_user_id()
  );
$$;

alter table public.merchants enable row level security;
alter table public.merchant_members enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.api_keys enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_admins enable row level security;
alter table public.settlement_accounts enable row level security;
alter table public.settlements enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.payment_links enable row level security;
alter table public.refunds enable row level security;
alter table public.stored_objects enable row level security;

create policy merchants_select_member on public.merchants
  for select using (public.is_merchant_member(id) or public.is_platform_admin());

create policy merchants_insert_authenticated on public.merchants
  for insert with check (public.current_app_user_id() <> '');

create policy merchants_update_member on public.merchants
  for update using (public.is_merchant_member(id) or public.is_platform_admin());

create policy merchant_members_select on public.merchant_members
  for select using (
    user_id = public.current_app_user_id()
    or public.is_merchant_member(merchant_id)
    or public.is_platform_admin()
  );

create policy merchant_members_insert on public.merchant_members
  for insert with check (
    user_id = public.current_app_user_id()
    or public.is_platform_admin()
  );

create policy kyc_select on public.kyc_submissions
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy kyc_insert on public.kyc_submissions
  for insert with check (public.is_merchant_member(merchant_id));

create policy kyc_update_admin on public.kyc_submissions
  for update using (public.is_platform_admin() or public.is_merchant_member(merchant_id));

create policy kyc_docs_select on public.kyc_documents
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy kyc_docs_insert on public.kyc_documents
  for insert with check (public.is_merchant_member(merchant_id));

create policy api_keys_select on public.api_keys
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy api_keys_insert on public.api_keys
  for insert with check (public.is_merchant_member(merchant_id));

create policy api_keys_update on public.api_keys
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payments_select on public.payments
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payments_insert on public.payments
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payments_update on public.payments
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy webhooks_select on public.webhook_endpoints
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy webhooks_insert on public.webhook_endpoints
  for insert with check (public.is_merchant_member(merchant_id));

create policy webhooks_update on public.webhook_endpoints
  for update using (public.is_merchant_member(merchant_id));

create policy audit_select on public.audit_logs
  for select using (
    (merchant_id is not null and public.is_merchant_member(merchant_id))
    or public.is_platform_admin()
  );

create policy audit_insert on public.audit_logs
  for insert with check (public.current_app_user_id() <> '' or public.is_platform_admin());

create policy platform_admins_select_self on public.platform_admins
  for select using (
    user_id = public.current_app_user_id()
    or public.is_platform_admin()
  );

create policy settlement_accounts_select on public.settlement_accounts
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy settlement_accounts_insert on public.settlement_accounts
  for insert with check (public.is_merchant_member(merchant_id));

create policy settlement_accounts_update on public.settlement_accounts
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy settlements_select on public.settlements
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy settlements_insert_admin on public.settlements
  for insert with check (public.is_platform_admin());

create policy settlements_update_admin on public.settlements
  for update using (public.is_platform_admin());

create policy checkout_sessions_select on public.checkout_sessions
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy checkout_sessions_insert on public.checkout_sessions
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy checkout_sessions_update on public.checkout_sessions
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payment_links_select on public.payment_links
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payment_links_insert on public.payment_links
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payment_links_update on public.payment_links
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payment_links_delete on public.payment_links
  for delete using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy refunds_select on public.refunds
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy refunds_insert on public.refunds
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy refunds_update on public.refunds
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());
