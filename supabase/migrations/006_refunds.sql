-- Refunds: full or partial, returned to the customer's original payment method

create type refund_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled'
);

alter type payment_status add value if not exists 'partially_refunded';
alter type payment_status add value if not exists 'refunded';

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

create trigger refunds_updated_at
  before update on public.refunds
  for each row execute function public.set_updated_at();

alter table public.refunds enable row level security;

create policy refunds_select on public.refunds
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy refunds_insert on public.refunds
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy refunds_update on public.refunds
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());
