-- Switch user identity columns from Supabase Auth UUIDs to Clerk user IDs (text).
-- Run after an older 001_init.sql that used auth.users UUIDs.
-- Policies must be dropped before ALTER TYPE (Postgres error 0A000).

-- 1) Drop policies that reference user_id / actor columns
drop policy if exists merchant_members_select on public.merchant_members;
drop policy if exists merchant_members_insert on public.merchant_members;
drop policy if exists platform_admins_select_self on public.platform_admins;
drop policy if exists merchants_insert_authenticated on public.merchants;
drop policy if exists audit_insert on public.audit_logs;

-- Storage policies call is_merchant_member / is_platform_admin; drop so helpers can be replaced safely
drop policy if exists kyc_storage_select on storage.objects;
drop policy if exists kyc_storage_insert on storage.objects;

-- Other policies only call helpers; drop/recreate so helpers can change return logic
drop policy if exists merchants_select_member on public.merchants;
drop policy if exists merchants_update_member on public.merchants;
drop policy if exists kyc_select on public.kyc_submissions;
drop policy if exists kyc_insert on public.kyc_submissions;
drop policy if exists kyc_update_admin on public.kyc_submissions;
drop policy if exists kyc_docs_select on public.kyc_documents;
drop policy if exists kyc_docs_insert on public.kyc_documents;
drop policy if exists api_keys_select on public.api_keys;
drop policy if exists api_keys_insert on public.api_keys;
drop policy if exists api_keys_update on public.api_keys;
drop policy if exists payments_select on public.payments;
drop policy if exists payments_insert on public.payments;
drop policy if exists payments_update on public.payments;
drop policy if exists webhooks_select on public.webhook_endpoints;
drop policy if exists webhooks_insert on public.webhook_endpoints;
drop policy if exists webhooks_update on public.webhook_endpoints;
drop policy if exists audit_select on public.audit_logs;

-- 2) Drop FKs to auth.users
alter table public.merchant_members drop constraint if exists merchant_members_user_id_fkey;
alter table public.platform_admins drop constraint if exists platform_admins_user_id_fkey;
alter table public.kyc_submissions drop constraint if exists kyc_submissions_submitted_by_fkey;
alter table public.kyc_submissions drop constraint if exists kyc_submissions_reviewed_by_fkey;
alter table public.api_keys drop constraint if exists api_keys_created_by_fkey;
alter table public.audit_logs drop constraint if exists audit_logs_actor_user_id_fkey;

-- 3) Alter column types to text (Clerk user ids look like user_…)
alter table public.merchant_members
  alter column user_id type text using user_id::text;

alter table public.platform_admins
  alter column user_id type text using user_id::text;

alter table public.kyc_submissions
  alter column submitted_by type text using submitted_by::text;

alter table public.kyc_submissions
  alter column reviewed_by type text using reviewed_by::text;

alter table public.api_keys
  alter column created_by type text using created_by::text;

alter table public.audit_logs
  alter column actor_user_id type text using actor_user_id::text;

-- 4) Helpers: resolve caller from JWT `sub` (Clerk) when present
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

-- 5) Recreate policies (text-safe user id checks)
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
