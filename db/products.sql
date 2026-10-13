-- =============================================================================
-- Umoja: Products + multi-interval prices
-- Paste this into the Neon SQL Editor (after the base schema is applied).
-- Safe to re-run: uses IF NOT EXISTS / exception handlers.
--
-- Public storefront: /p/{slug}
-- Checkout charges reuse existing checkout_sessions (no new checkout tables).
-- Product/price ids and billing_interval are stored in checkout session metadata.
-- =============================================================================

do $$ begin
  create type product_status as enum ('active', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type product_fulfillment as enum ('goods_services', 'digital', 'hybrid');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type product_pricing_type as enum ('single', 'pay_what_you_want', 'subscription', 'usage');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type price_interval as enum ('one_time', 'day', 'week', 'month', 'year');
exception when duplicate_object then null;
end $$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  image_path text,
  fulfillment product_fulfillment not null default 'goods_services',
  pricing_type product_pricing_type not null default 'single',
  track_stock boolean not null default false,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  mode api_key_mode not null default 'test',
  status product_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_merchant_id_idx on public.products (merchant_id);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_created_at_idx on public.products (created_at desc);

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  amount integer not null check (amount >= 0),
  currency currency_code not null default 'KES',
  billing_interval price_interval not null default 'one_time',
  nickname text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_prices_product_id_idx on public.product_prices (product_id);
create index if not exists product_prices_merchant_id_idx on public.product_prices (merchant_id);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists product_prices_updated_at on public.product_prices;
create trigger product_prices_updated_at
  before update on public.product_prices
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_prices enable row level security;

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists product_prices_select on public.product_prices;
create policy product_prices_select on public.product_prices
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists product_prices_insert on public.product_prices;
create policy product_prices_insert on public.product_prices
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists product_prices_update on public.product_prices;
create policy product_prices_update on public.product_prices
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists product_prices_delete on public.product_prices;
create policy product_prices_delete on public.product_prices
  for delete using (public.is_merchant_member(merchant_id) or public.is_platform_admin());
