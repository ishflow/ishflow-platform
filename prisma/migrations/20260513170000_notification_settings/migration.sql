-- Operational email notifications:
-- 1. Per-tenant notification settings (toggles + thresholds) stored as JSON.
--    NULL = use system defaults; readers merge with DEFAULT_NOTIFICATION_SETTINGS.
-- 2. Backfill `sales.invoice:send_email` permission onto existing seeded roles.

ALTER TABLE "tenant" ADD COLUMN "notification_settings" JSONB;

-- Idempotent permission backfill for the explicit "send invoice email" trigger.
-- Granted to roles that already have sales.invoice:write so they can also send.
UPDATE "role"
SET permissions = permissions || ARRAY['sales.invoice:send_email']
WHERE "is_system" = TRUE
  AND name IN ('owner', 'admin', 'chief_accountant', 'bookkeeper', 'sales')
  AND NOT ('sales.invoice:send_email' = ANY(permissions));
