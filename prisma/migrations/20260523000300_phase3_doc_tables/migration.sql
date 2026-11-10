-- Phase 3: 4 more 1C documents (expense_report, service_sale, service_receipt, retail_sale).
-- Header + line tables + RLS in one migration.

CREATE TABLE IF NOT EXISTS "document_treasury_expense_report" (
  "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID            NOT NULL,
  "number"        TEXT            NOT NULL,
  "status"        TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"     TIMESTAMP(3),
  "posted_by"     UUID,
  "version"       INTEGER         NOT NULL DEFAULT 0,
  "date"          TIMESTAMP(3)    NOT NULL,
  "employee"      TEXT,
  "cash_register" UUID,
  "currency"      VARCHAR(3),
  "fx_rate"       DECIMAL(18, 8),
  "purpose"       TEXT,
  "notes"         TEXT,
  "created_at"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)    NOT NULL,
  "deleted_at"    TIMESTAMP(3),

  CONSTRAINT "document_treasury_expense_report_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_treasury_expense_report_tenant_id_number_key"
  ON "document_treasury_expense_report" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_treasury_expense_report_tenant_id_idx" ON "document_treasury_expense_report" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_treasury_expense_report_tenant_deleted_idx" ON "document_treasury_expense_report" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_treasury_expense_report_tenant_status_idx" ON "document_treasury_expense_report" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_treasury_expense_report_tenant_posted_idx" ON "document_treasury_expense_report" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_treasury_expense_report_tenant_cashreg_idx" ON "document_treasury_expense_report" ("tenant_id", "cash_register");

CREATE TABLE IF NOT EXISTS "document_line_treasury_expense_report_items" (
  "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID            NOT NULL,
  "document_id" UUID            NOT NULL,
  "sequence"    INTEGER         NOT NULL,
  "category"    TEXT,
  "description" TEXT,
  "amount"      DECIMAL(14, 2)  NOT NULL,
  "receipt"     TEXT,
  "created_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "document_line_treasury_expense_report_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_treasury_exp_rep_items_t_d_s_key"
  ON "document_line_treasury_expense_report_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_treasury_exp_rep_items_t_idx" ON "document_line_treasury_expense_report_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_treasury_exp_rep_items_t_d_idx" ON "document_line_treasury_expense_report_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_sales_service_sale" (
  "id"              UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID            NOT NULL,
  "number"          TEXT            NOT NULL,
  "status"          TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"       TIMESTAMP(3),
  "posted_by"       UUID,
  "version"         INTEGER         NOT NULL DEFAULT 0,
  "date"            TIMESTAMP(3)    NOT NULL,
  "customer"        UUID            NOT NULL,
  "currency"        VARCHAR(3),
  "fx_rate"         DECIMAL(18, 8),
  "assigned_rep_id" TEXT,
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)    NOT NULL,
  "deleted_at"      TIMESTAMP(3),

  CONSTRAINT "document_sales_service_sale_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_sales_service_sale_tenant_id_number_key"
  ON "document_sales_service_sale" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_sales_service_sale_t_idx" ON "document_sales_service_sale" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_sales_service_sale_t_deleted_idx" ON "document_sales_service_sale" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_sales_service_sale_t_status_idx" ON "document_sales_service_sale" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_sales_service_sale_t_posted_idx" ON "document_sales_service_sale" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_sales_service_sale_t_customer_idx" ON "document_sales_service_sale" ("tenant_id", "customer");

CREATE TABLE IF NOT EXISTS "document_line_sales_service_sale_items" (
  "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID            NOT NULL,
  "document_id" UUID            NOT NULL,
  "sequence"    INTEGER         NOT NULL,
  "description" TEXT            NOT NULL,
  "quantity"    INTEGER         NOT NULL DEFAULT 1,
  "price"       DECIMAL(14, 2)  NOT NULL,
  "created_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "document_line_sales_service_sale_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_sales_service_sale_items_t_d_s_key"
  ON "document_line_sales_service_sale_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_sales_service_sale_items_t_idx" ON "document_line_sales_service_sale_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_sales_service_sale_items_t_d_idx" ON "document_line_sales_service_sale_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_purchases_service_receipt" (
  "id"                UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID            NOT NULL,
  "number"            TEXT            NOT NULL,
  "status"            TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"         TIMESTAMP(3),
  "posted_by"         UUID,
  "version"           INTEGER         NOT NULL DEFAULT 0,
  "date"              TIMESTAMP(3)    NOT NULL,
  "supplier"          UUID            NOT NULL,
  "currency"          VARCHAR(3),
  "fx_rate"           DECIMAL(18, 8),
  "supplier_doc_no"   TEXT,
  "assigned_buyer_id" UUID,
  "notes"             TEXT,
  "created_at"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)    NOT NULL,
  "deleted_at"        TIMESTAMP(3),

  CONSTRAINT "document_purchases_service_receipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_purchases_service_receipt_t_n_key"
  ON "document_purchases_service_receipt" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_purchases_service_receipt_t_idx" ON "document_purchases_service_receipt" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_purchases_service_receipt_t_deleted_idx" ON "document_purchases_service_receipt" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_purchases_service_receipt_t_status_idx" ON "document_purchases_service_receipt" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_purchases_service_receipt_t_posted_idx" ON "document_purchases_service_receipt" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_purchases_service_receipt_t_supplier_idx" ON "document_purchases_service_receipt" ("tenant_id", "supplier");

CREATE TABLE IF NOT EXISTS "document_line_purchases_service_receipt_items" (
  "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID            NOT NULL,
  "document_id" UUID            NOT NULL,
  "sequence"    INTEGER         NOT NULL,
  "description" TEXT            NOT NULL,
  "quantity"    INTEGER         NOT NULL DEFAULT 1,
  "price"       DECIMAL(14, 2)  NOT NULL,
  "created_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "document_line_purchases_service_receipt_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_purchases_service_receipt_items_t_d_s_key"
  ON "document_line_purchases_service_receipt_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_purchases_service_receipt_items_t_idx" ON "document_line_purchases_service_receipt_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_purchases_service_receipt_items_t_d_idx" ON "document_line_purchases_service_receipt_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_sales_retail_sale" (
  "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID            NOT NULL,
  "number"        TEXT            NOT NULL,
  "status"        TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"     TIMESTAMP(3),
  "posted_by"     UUID,
  "version"       INTEGER         NOT NULL DEFAULT 0,
  "date"          TIMESTAMP(3)    NOT NULL,
  "warehouse"     UUID            NOT NULL,
  "cash_register" UUID,
  "currency"      VARCHAR(3),
  "fx_rate"       DECIMAL(18, 8),
  "notes"         TEXT,
  "created_at"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)    NOT NULL,
  "deleted_at"    TIMESTAMP(3),

  CONSTRAINT "document_sales_retail_sale_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_sales_retail_sale_tenant_id_number_key"
  ON "document_sales_retail_sale" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_sales_retail_sale_t_idx" ON "document_sales_retail_sale" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_sales_retail_sale_t_deleted_idx" ON "document_sales_retail_sale" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_sales_retail_sale_t_status_idx" ON "document_sales_retail_sale" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_sales_retail_sale_t_posted_idx" ON "document_sales_retail_sale" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_sales_retail_sale_t_warehouse_idx" ON "document_sales_retail_sale" ("tenant_id", "warehouse");
CREATE INDEX IF NOT EXISTS "document_sales_retail_sale_t_cashreg_idx" ON "document_sales_retail_sale" ("tenant_id", "cash_register");

CREATE TABLE IF NOT EXISTS "document_line_sales_retail_sale_items" (
  "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID            NOT NULL,
  "document_id" UUID            NOT NULL,
  "sequence"    INTEGER         NOT NULL,
  "product"     UUID            NOT NULL,
  "quantity"    INTEGER         NOT NULL,
  "price"       DECIMAL(14, 2)  NOT NULL,
  "created_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "document_line_sales_retail_sale_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_sales_retail_sale_items_t_d_s_key"
  ON "document_line_sales_retail_sale_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_sales_retail_sale_items_t_idx" ON "document_line_sales_retail_sale_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_sales_retail_sale_items_t_d_idx" ON "document_line_sales_retail_sale_items" ("tenant_id", "document_id");

-- RLS: tenant_isolation + bypass on all 8 new tables.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_treasury_expense_report',
    'document_line_treasury_expense_report_items',
    'document_sales_service_sale',
    'document_line_sales_service_sale_items',
    'document_purchases_service_receipt',
    'document_line_purchases_service_receipt_items',
    'document_sales_retail_sale',
    'document_line_sales_retail_sale_items'
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
