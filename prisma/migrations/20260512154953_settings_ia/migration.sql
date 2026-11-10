-- Settings IA migration:
-- 1. Add `deleted` value to TenantStatus enum (for soft-delete via Danger Zone).
-- 2. Make app_current_tenant_id() return NULL when the active tenant is soft-deleted,
--    so every RLS-enforced query under withTenant() naturally returns zero rows for
--    deleted tenants without rewriting per-table policies.
-- 3. Backfill admin.organization:{edit,delete} permissions on existing seeded roles.

-- 1. New enum value (Tenant.status = 'deleted' set by deleteOrganizationAction)
ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'deleted';

-- 2. Soft-delete-aware tenant resolution.
--    NULLIF(...) returns NULL when no session tenant is set; the outer query then
--    returns the tenant id only if the row exists AND deleted_at is null.
--    Mark STABLE so RLS can cache the result for the duration of the statement.
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid AS $$
  SELECT t.id
  FROM tenant t
  WHERE t.id = NULLIF(current_setting('app.tenant_id', TRUE), '')::uuid
    AND t.deleted_at IS NULL
$$ LANGUAGE SQL STABLE;

-- 3. Grant the new permissions on existing tenants so the migration is forward-
--    compatible with the updated seed (platform/auth/seed-system-roles.ts).
--    Idempotent: append only if the string isn't already present.
UPDATE "role"
SET permissions = permissions || ARRAY['admin.organization:edit', 'admin.organization:delete']
WHERE "is_system" = TRUE
  AND name = 'owner'
  AND NOT ('admin.organization:edit' = ANY(permissions));

UPDATE "role"
SET permissions = permissions || ARRAY['admin.organization:edit']
WHERE "is_system" = TRUE
  AND name = 'admin'
  AND NOT ('admin.organization:edit' = ANY(permissions));
