-- Prove tenant A cannot read tenant B checkout sessions
-- Run after 004_checkout.sql with two seeded merchants if desired.
-- Placeholder assertions for CI / manual review.

-- SELECT count(*) FROM checkout_sessions WHERE merchant_id = :tenant_b
-- AS role of tenant_a member MUST return 0 under RLS.
