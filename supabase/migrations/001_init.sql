-- Umoja Payments MVP schema
create extension if not exists "pgcrypto";

-- Enums
create type merchant_status as enum ('draft', 'pending_kyc', 'active', 'rejected', 'suspended');
create type member_role as enum ('owner', 'developer');
create type kyc_status as enum ('draft', 'pending', 'approved', 'rejected');
create type api_key_mode as enum ('test', 'live');
create type payment_status as enum ('pending', 'processing', 'succeeded', 'failed', 'canceled');
create type payment_method as enum ('mpesa_stk');
create type currency_code as enum ('KES', 'TZS', 'UGX', 'RWF');
create type country_code as enum ('KE', 'TZ', 'UG', 'RW');

-- Merchants
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  country country_code not null default 'KE',
  status merchant_status not null default 'draft',
  website text,
  support_email text,
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

-- KYC
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

-- API keys (secret stored hashed only)
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

-- Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  amount integer not null check (amount > 0),
  currency currency_code not null,
  method payment_method not null default 'mpesa_stk',
  phone text not null,
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

-- Webhooks
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

-- Audit
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

-- Platform admins
create table public.platform_admins (
  user_id text primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Helpers
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

create or replace function public.current_app_user_id()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'sub', auth.uid()::text, '');
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

-- RLS
alter table public.merchants enable row level security;
alter table public.merchant_members enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.api_keys enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_admins enable row level security;

-- Merchants policies
create policy merchants_select_member on public.merchants
  for select using (public.is_merchant_member(id) or public.is_platform_admin());

create policy merchants_insert_authenticated on public.merchants
  for insert with check (public.current_app_user_id() <> '');

create policy merchants_update_member on public.merchants
  for update using (public.is_merchant_member(id) or public.is_platform_admin());

-- Members policies
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

-- KYC policies
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

-- API keys
create policy api_keys_select on public.api_keys
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy api_keys_insert on public.api_keys
  for insert with check (public.is_merchant_member(merchant_id));

create policy api_keys_update on public.api_keys
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

-- Payments
create policy payments_select on public.payments
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payments_insert on public.payments
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payments_update on public.payments
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

-- Webhooks
create policy webhooks_select on public.webhook_endpoints
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy webhooks_insert on public.webhook_endpoints
  for insert with check (public.is_merchant_member(merchant_id));

create policy webhooks_update on public.webhook_endpoints
  for update using (public.is_merchant_member(merchant_id));

-- Audit
create policy audit_select on public.audit_logs
  for select using (
    (merchant_id is not null and public.is_merchant_member(merchant_id))
    or public.is_platform_admin()
  );

create policy audit_insert on public.audit_logs
  for insert with check (public.current_app_user_id() <> '' or public.is_platform_admin());

-- Platform admins: users can read own row; inserts via service role
create policy platform_admins_select_self on public.platform_admins
  for select using (
    user_id = public.current_app_user_id()
    or public.is_platform_admin()
  );

-- Storage bucket for KYC (run in dashboard or via storage API)
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

create policy kyc_storage_select on storage.objects
  for select using (
    bucket_id = 'kyc'
    and (
      public.is_platform_admin()
      or public.is_merchant_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy kyc_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'kyc'
    and public.is_merchant_member((storage.foldername(name))[1]::uuid)
  );
