-- Pre-existing branch defect fix: the price_setting document tables are
-- defined in prisma/schema.prisma but never created by any migration —
-- previously they were bootstrapped via `prisma db push` only. This
-- migration adds the canonical CREATE TABLE statements so `prisma migrate
-- reset` produces a working DB end-to-end.
--
-- Idempotent (IF NOT EXISTS) so re-running against a partially-bootstrapped
-- dev DB is safe.

CREATE TABLE IF NOT EXISTS "document_inventory_price_setting" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   uuid NOT NULL,
  "number"      text NOT NULL,
  "status"      text NOT NULL DEFAULT 'SAVED',
  "posted_at"   timestamp,
  "posted_by"   uuid,
  "version"     int NOT NULL DEFAULT 0,
  "date"        timestamp NOT NULL,
  "priceType"   uuid NOT NULL,
  "created_at"  timestamp NOT NULL DEFAULT now(),
  "updated_at"  timestamp NOT NULL,
  "deleted_at"  timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_number_key"
  ON "document_inventory_price_setting" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_idx"
  ON "document_inventory_price_setting" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_deleted_at_idx"
  ON "document_inventory_price_setting" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_status_idx"
  ON "document_inventory_price_setting" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_posted_at_idx"
  ON "document_inventory_price_setting" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_created_at_idx"
  ON "document_inventory_price_setting" ("tenant_id", "created_at");

CREATE TABLE IF NOT EXISTS "document_line_inventory_price_setting_items" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"    uuid NOT NULL,
  "document_id"  uuid NOT NULL,
  "sequence"     int NOT NULL,
  "product"      uuid NOT NULL,
  "price"        numeric(14,2) NOT NULL,
  "created_at"   timestamp NOT NULL DEFAULT now(),
  "updated_at"   timestamp NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_line_inventory_price_setting_items_tenant_id_document_id_sequence_key"
  ON "document_line_inventory_price_setting_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "document_line_inventory_price_setting_items_tenant_id_idx"
  ON "document_line_inventory_price_setting_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_line_inventory_price_setting_items_tenant_id_document_id_idx"
  ON "document_line_inventory_price_setting_items" ("tenant_id", "document_id");

-- RLS — same pattern as the rest of the schema
ALTER TABLE "document_inventory_price_setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_inventory_price_setting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_inventory_price_setting_tenant_isolation" ON "document_inventory_price_setting";
CREATE POLICY "document_inventory_price_setting_tenant_isolation"
  ON "document_inventory_price_setting"
  USING ("tenant_id" = app_current_tenant_id())
  WITH CHECK ("tenant_id" = app_current_tenant_id());
DROP POLICY IF EXISTS "document_inventory_price_setting_superuser_bypass" ON "document_inventory_price_setting";
CREATE POLICY "document_inventory_price_setting_superuser_bypass"
  ON "document_inventory_price_setting"
  USING (current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "document_line_inventory_price_setting_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_line_inventory_price_setting_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_line_inventory_price_setting_items_tenant_isolation" ON "document_line_inventory_price_setting_items";
CREATE POLICY "document_line_inventory_price_setting_items_tenant_isolation"
  ON "document_line_inventory_price_setting_items"
  USING ("tenant_id" = app_current_tenant_id())
  WITH CHECK ("tenant_id" = app_current_tenant_id());
DROP POLICY IF EXISTS "document_line_inventory_price_setting_items_superuser_bypass" ON "document_line_inventory_price_setting_items";
CREATE POLICY "document_line_inventory_price_setting_items_superuser_bypass"
  ON "document_line_inventory_price_setting_items"
  USING (current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on');
