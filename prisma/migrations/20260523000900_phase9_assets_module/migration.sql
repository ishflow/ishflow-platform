-- Phase 9: fixed assets module foundation.
-- 1 catalog (fixed_asset) + 3 docs (receipt, commissioning, disposal).

CREATE TABLE IF NOT EXISTS "catalog_assets_fixed_asset" (
  "id"                  UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID            NOT NULL,
  "code"                TEXT            NOT NULL,
  "name"                TEXT            NOT NULL,
  "inventory_number"    TEXT,
  "category"            TEXT,
  "manufacturer"        TEXT,
  "serial_number"       TEXT,
  "acquisition_date"    TIMESTAMP(3),
  "acquisition_cost"    DECIMAL(14, 2),
  "currency"            VARCHAR(3),
  "useful_life_months"  INTEGER,
  "depreciation_method" TEXT,
  "status"              TEXT            NOT NULL DEFAULT 'registered',
  "location"            TEXT,
  "responsible_id"      TEXT,
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)    NOT NULL,
  "deleted_at"          TIMESTAMP(3),
  CONSTRAINT "catalog_assets_fixed_asset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_assets_fixed_asset_tenant_id_code_key"
  ON "catalog_assets_fixed_asset" ("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "cat_a_fa_t_idx" ON "catalog_assets_fixed_asset" ("tenant_id");
CREATE INDEX IF NOT EXISTS "cat_a_fa_t_d_idx" ON "catalog_assets_fixed_asset" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "cat_a_fa_t_s_idx" ON "catalog_assets_fixed_asset" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "cat_a_fa_t_cat_idx" ON "catalog_assets_fixed_asset" ("tenant_id", "category");
CREATE INDEX IF NOT EXISTS "cat_a_fa_t_loc_idx" ON "catalog_assets_fixed_asset" ("tenant_id", "location");
CREATE INDEX IF NOT EXISTS "cat_a_fa_t_inv_idx" ON "catalog_assets_fixed_asset" ("tenant_id", "inventory_number");

CREATE TABLE IF NOT EXISTS "document_assets_receipt" (
  "id"             UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID            NOT NULL,
  "number"         TEXT            NOT NULL,
  "status"         TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"      TIMESTAMP(3),
  "posted_by"      UUID,
  "version"        INTEGER         NOT NULL DEFAULT 0,
  "date"           TIMESTAMP(3)    NOT NULL,
  "asset"          UUID            NOT NULL,
  "supplier"       UUID,
  "amount"         DECIMAL(14, 2)  NOT NULL,
  "currency"       VARCHAR(3),
  "fx_rate"        DECIMAL(18, 8),
  "location"       TEXT,
  "responsible_id" TEXT,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3)    NOT NULL,
  "deleted_at"     TIMESTAMP(3),
  CONSTRAINT "document_assets_receipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_assets_receipt_tenant_id_number_key"
  ON "document_assets_receipt" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_a_rec_t_idx" ON "document_assets_receipt" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_a_rec_t_d_idx" ON "document_assets_receipt" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_a_rec_t_s_idx" ON "document_assets_receipt" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_a_rec_t_p_idx" ON "document_assets_receipt" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_a_rec_t_a_idx" ON "document_assets_receipt" ("tenant_id", "asset");
CREATE INDEX IF NOT EXISTS "doc_a_rec_t_sup_idx" ON "document_assets_receipt" ("tenant_id", "supplier");

CREATE TABLE IF NOT EXISTS "document_assets_commissioning" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "number"           TEXT         NOT NULL,
  "status"           TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"        TIMESTAMP(3),
  "posted_by"        UUID,
  "version"          INTEGER      NOT NULL DEFAULT 0,
  "date"             TIMESTAMP(3) NOT NULL,
  "asset"            UUID         NOT NULL,
  "location"         TEXT,
  "responsible_id"   TEXT,
  "commission_notes" TEXT,
  "workflow_status"  TEXT         NOT NULL DEFAULT 'draft',
  "approved_by"      TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,
  "deleted_at"       TIMESTAMP(3),
  CONSTRAINT "document_assets_commissioning_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_assets_commissioning_tenant_id_number_key"
  ON "document_assets_commissioning" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_a_com_t_idx" ON "document_assets_commissioning" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_a_com_t_d_idx" ON "document_assets_commissioning" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_a_com_t_s_idx" ON "document_assets_commissioning" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_a_com_t_ws_idx" ON "document_assets_commissioning" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_a_com_t_p_idx" ON "document_assets_commissioning" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_a_com_t_a_idx" ON "document_assets_commissioning" ("tenant_id", "asset");

CREATE TABLE IF NOT EXISTS "document_assets_disposal" (
  "id"                UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID            NOT NULL,
  "number"            TEXT            NOT NULL,
  "status"            TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"         TIMESTAMP(3),
  "posted_by"         UUID,
  "version"           INTEGER         NOT NULL DEFAULT 0,
  "date"              TIMESTAMP(3)    NOT NULL,
  "asset"             UUID            NOT NULL,
  "reason"            TEXT,
  "disposal_method"   TEXT,
  "recoverable_value" DECIMAL(14, 2),
  "currency"          VARCHAR(3),
  "fx_rate"           DECIMAL(18, 8),
  "approved_by"       TEXT,
  "notes"             TEXT,
  "created_at"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)    NOT NULL,
  "deleted_at"        TIMESTAMP(3),
  CONSTRAINT "document_assets_disposal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_assets_disposal_tenant_id_number_key"
  ON "document_assets_disposal" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_a_dis_t_idx" ON "document_assets_disposal" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_a_dis_t_d_idx" ON "document_assets_disposal" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_a_dis_t_s_idx" ON "document_assets_disposal" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_a_dis_t_p_idx" ON "document_assets_disposal" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_a_dis_t_a_idx" ON "document_assets_disposal" ("tenant_id", "asset");
CREATE INDEX IF NOT EXISTS "doc_a_dis_t_dm_idx" ON "document_assets_disposal" ("tenant_id", "disposal_method");

-- RLS for all 4 new tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'catalog_assets_fixed_asset',
    'document_assets_receipt',
    'document_assets_commissioning',
    'document_assets_disposal'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation" ON %I FOR ALL TO canalog_app '
      'USING ("tenant_id" = current_setting(''app.tenant_id'', true)::uuid) '
      'WITH CHECK ("tenant_id" = current_setting(''app.tenant_id'', true)::uuid)',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS "bypass_full" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "bypass_full" ON %I FOR ALL TO canalog '
      'USING (true) WITH CHECK (true)',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO canalog_app', t);
  END LOOP;
END $$;
