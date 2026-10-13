-- =============================================================================
-- Umoja: Invoices
-- Paste this into the Neon SQL Editor (after the base schema is applied).
-- Safe to re-run: uses IF NOT EXISTS / exception handlers.
--
-- Dashboard: /dashboard/invoices
-- Public pay page: /invoice/{slug}
-- Payment uses existing checkout_sessions; invoice id/slug stored in metadata.
-- =============================================================================

do $$ begin
  create type invoice_status as enum ('draft', 'open', 'paid', 'void');
exception when duplicate_object then null;
end $$;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  slug text not null unique,
  number text not null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  currency currency_code not null default 'KES',
  amount integer not null check (amount >= 0),
  line_items jsonb not null default '[]'::jsonb,
  memo text,
  due_date date,
  status invoice_status not null default 'open',
  mode api_key_mode not null default 'test',
  payment_id uuid references public.payments (id) on delete set null,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, number)
);

create index if not exists invoices_merchant_id_idx on public.invoices (merchant_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_created_at_idx on public.invoices (created_at desc);
create index if not exists invoices_due_date_idx on public.invoices (due_date);

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices
  for delete using (public.is_merchant_member(merchant_id) or public.is_platform_admin());
