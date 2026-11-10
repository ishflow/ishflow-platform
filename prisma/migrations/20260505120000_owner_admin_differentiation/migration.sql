-- Add owner/admin differentiation fields to tenant
ALTER TABLE tenant
  ADD COLUMN legal_name TEXT,
  ADD COLUMN logo_url TEXT,
  ADD COLUMN brand_color TEXT,
  ADD COLUMN archived_by UUID;

-- Partial unique index to enforce exactly one owner role per tenant.
-- Skipped for now: Prisma does not natively support partial indexes on
-- relation tables (_MembershipToRole). App-level guards enforce the
-- single-owner invariant. Revisit when Prisma adds partial-index support
-- for implicit join tables.
