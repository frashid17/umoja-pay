-- Prove tenant A cannot read tenant B payment links
-- Run after 005_payment_links.sql with two seeded merchants if desired.
-- Placeholder assertions for CI / manual review.

-- SELECT count(*) FROM payment_links WHERE merchant_id = :tenant_b
-- AS role of tenant_a member MUST return 0 under RLS.
