-- Card payments, merchant branding, hosted checkout sessions

alter type payment_method add value if not exists 'card';

alter table public.payments
  alter column phone drop not null;

alter table public.merchants
  add column if not exists logo_path text,
  add column if not exists brand_accent text;

create type checkout_session_status as enum (
  'open',
  'completed',
  'expired',
  'canceled'
);

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

create trigger checkout_sessions_updated_at
  before update on public.checkout_sessions
  for each row execute function public.set_updated_at();

alter table public.checkout_sessions enable row level security;

create policy checkout_sessions_select on public.checkout_sessions
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy checkout_sessions_insert on public.checkout_sessions
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy checkout_sessions_update on public.checkout_sessions
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

-- Public merchant logos (path = {merchant_id}/logo.{ext})
insert into storage.buckets (id, name, public)
values ('merchant-logos', 'merchant-logos', true)
on conflict (id) do update set public = true;

create policy merchant_logos_public_read on storage.objects
  for select using (bucket_id = 'merchant-logos');

create policy merchant_logos_member_insert on storage.objects
  for insert with check (
    bucket_id = 'merchant-logos'
    and (
      public.is_platform_admin()
      or public.is_merchant_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy merchant_logos_member_update on storage.objects
  for update using (
    bucket_id = 'merchant-logos'
    and (
      public.is_platform_admin()
      or public.is_merchant_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy merchant_logos_member_delete on storage.objects
  for delete using (
    bucket_id = 'merchant-logos'
    and (
      public.is_platform_admin()
      or public.is_merchant_member((storage.foldername(name))[1]::uuid)
    )
  );
