-- Reusable payment links (product name, optional image, QR checkout)

create type payment_link_status as enum ('active', 'archived');

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

create trigger payment_links_updated_at
  before update on public.payment_links
  for each row execute function public.set_updated_at();

alter table public.payment_links enable row level security;

-- Members manage their links; public reads happen via service role in app code
create policy payment_links_select on public.payment_links
  for select using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payment_links_insert on public.payment_links
  for insert with check (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payment_links_update on public.payment_links
  for update using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

create policy payment_links_delete on public.payment_links
  for delete using (public.is_merchant_member(merchant_id) or public.is_platform_admin());

-- Product images for payment links (path = {merchant_id}/{link_id}.{ext})
insert into storage.buckets (id, name, public)
values ('payment-link-images', 'payment-link-images', true)
on conflict (id) do update set public = true;

create policy payment_link_images_public_read on storage.objects
  for select using (bucket_id = 'payment-link-images');

create policy payment_link_images_member_insert on storage.objects
  for insert with check (
    bucket_id = 'payment-link-images'
    and (
      public.is_platform_admin()
      or public.is_merchant_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy payment_link_images_member_update on storage.objects
  for update using (
    bucket_id = 'payment-link-images'
    and (
      public.is_platform_admin()
      or public.is_merchant_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy payment_link_images_member_delete on storage.objects
  for delete using (
    bucket_id = 'payment-link-images'
    and (
      public.is_platform_admin()
      or public.is_merchant_member((storage.foldername(name))[1]::uuid)
    )
  );
