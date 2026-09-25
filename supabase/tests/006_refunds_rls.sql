-- Prove tenant A cannot read tenant B refunds
-- Run after 006_refunds.sql with two seeded merchants if desired.
-- Placeholder assertions for CI / manual review.

-- SELECT count(*) FROM refunds WHERE merchant_id = :tenant_b
-- AS role of tenant_a member MUST return 0 under RLS.
