-- Settlements + settlement destination accounts (tenant-scoped)

create type settlement_status as enum ('pending', 'processing', 'paid', 'failed');

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

alter table public.merchants
  add column if not exists support_phone text,
  add column if not exists statement_email text;

create trigger settlement_accounts_updated_at
  before update on public.settlement_accounts
  for each row execute function public.set_updated_at();

create trigger settlements_updated_at
  before update on public.settlements
  for each row execute function public.set_updated_at();

alter table public.settlement_accounts enable row level security;
alter table public.settlements enable row level security;

create policy settlement_accounts_select on public.settlement_accounts
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy settlement_accounts_insert on public.settlement_accounts
  for insert with check (public.is_merchant_member(merchant_id));

create policy settlement_accounts_update on public.settlement_accounts
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy settlements_select on public.settlements
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

-- Settlements rows are created by platform ops / service role, not merchants
create policy settlements_insert_admin on public.settlements
  for insert with check (public.is_platform_admin());

create policy settlements_update_admin on public.settlements
  for update using (public.is_platform_admin());
