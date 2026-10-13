-- Confirms every tenant-scoped table has a select policy.
-- The app connects as the database owner (RLS bypass, same as the old
-- service role). These policies apply when a session sets app.user_id
-- and connects as a non-owner role.

do $$
declare
  missing text;
begin
  select string_agg(t.relname, ', ')
  into missing
  from pg_class t
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relkind = 'r'
    and t.relname in (
      'merchants',
      'merchant_members',
      'kyc_submissions',
      'kyc_documents',
      'api_keys',
      'payments',
      'webhook_endpoints',
      'audit_logs',
      'platform_admins',
      'settlement_accounts',
      'settlements',
      'checkout_sessions',
      'payment_links',
      'products',
      'product_prices',
      'invoices',
      'refunds'
    )
    and not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.relname
        and p.cmd = 'SELECT'
    );

  if missing is not null then
    raise exception 'tenant tables missing SELECT policies: %', missing;
  end if;
end $$;
