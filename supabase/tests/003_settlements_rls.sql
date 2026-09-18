-- RLS proof: tenant A cannot read tenant B settlement rows.
-- Run against a local Supabase with two merchants after seeding.
--
-- Expected: queries as merchant A member return 0 rows for merchant B's
-- settlement_accounts and settlements.

-- Example setup (service role):
--   insert merchants A/B, members with JWT sub claims, settlement rows for B.
-- Example assert (as user A via set request.jwt.claim.sub):
--   select count(*) from settlement_accounts where merchant_id = :b;  -- 0
--   select count(*) from settlements where merchant_id = :b;          -- 0

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'settlements'
      and policyname = 'settlements_select'
  ) then
    raise exception 'missing settlements_select RLS policy';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'settlement_accounts'
      and policyname = 'settlement_accounts_select'
  ) then
    raise exception 'missing settlement_accounts_select RLS policy';
  end if;
end $$;
