-- Phase 4: cash flow + production docs.
-- treasury.cash_transfer, sales.refund_payment, purchases.refund_received, inventory.production_report.

CREATE TABLE IF NOT EXISTS "document_treasury_cash_transfer" (
  "id"           UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID            NOT NULL,
  "number"       TEXT            NOT NULL,
  "status"       TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"    TIMESTAMP(3),
  "posted_by"    UUID,
  "version"      INTEGER         NOT NULL DEFAULT 0,
  "date"         TIMESTAMP(3)    NOT NULL,
  "from_cash_reg" UUID           NOT NULL,
  "to_cash_reg"  UUID            NOT NULL,
  "amount"       DECIMAL(14, 2)  NOT NULL,
  "currency"     VARCHAR(3),
  "fx_rate"      DECIMAL(18, 8),
  "notes"        TEXT,
  "created_at"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)    NOT NULL,
  "deleted_at"   TIMESTAMP(3),

  CONSTRAINT "document_treasury_cash_transfer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_treasury_cash_transfer_tenant_id_number_key"
  ON "document_treasury_cash_transfer" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_treasury_cash_transfer_t_idx" ON "document_treasury_cash_transfer" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_treasury_cash_transfer_t_deleted_idx" ON "document_treasury_cash_transfer" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_treasury_cash_transfer_t_status_idx" ON "document_treasury_cash_transfer" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_treasury_cash_transfer_t_posted_idx" ON "document_treasury_cash_transfer" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_treasury_cash_transfer_t_from_idx" ON "document_treasury_cash_transfer" ("tenant_id", "from_cash_reg");
CREATE INDEX IF NOT EXISTS "doc_treasury_cash_transfer_t_to_idx" ON "document_treasury_cash_transfer" ("tenant_id", "to_cash_reg");

CREATE TABLE IF NOT EXISTS "document_sales_refund_payment" (
  "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID            NOT NULL,
  "number"        TEXT            NOT NULL,
  "status"        TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"     TIMESTAMP(3),
  "posted_by"     UUID,
  "version"       INTEGER         NOT NULL DEFAULT 0,
  "date"          TIMESTAMP(3)    NOT NULL,
  "customer"      UUID            NOT NULL,
  "cash_register" UUID,
  "amount"        DECIMAL(14, 2)  NOT NULL,
  "currency"      VARCHAR(3),
  "fx_rate"       DECIMAL(18, 8),
  "reason"        TEXT,
  "notes"         TEXT,
  "created_at"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)    NOT NULL,
  "deleted_at"    TIMESTAMP(3),

  CONSTRAINT "document_sales_refund_payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_sales_refund_payment_tenant_id_number_key"
  ON "document_sales_refund_payment" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_sales_refund_payment_t_idx" ON "document_sales_refund_payment" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_sales_refund_payment_t_deleted_idx" ON "document_sales_refund_payment" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_sales_refund_payment_t_status_idx" ON "document_sales_refund_payment" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_sales_refund_payment_t_posted_idx" ON "document_sales_refund_payment" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_sales_refund_payment_t_customer_idx" ON "document_sales_refund_payment" ("tenant_id", "customer");

CREATE TABLE IF NOT EXISTS "document_purchases_refund_received" (
  "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID            NOT NULL,
  "number"        TEXT            NOT NULL,
  "status"        TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"     TIMESTAMP(3),
  "posted_by"     UUID,
  "version"       INTEGER         NOT NULL DEFAULT 0,
  "date"          TIMESTAMP(3)    NOT NULL,
  "supplier"      UUID            NOT NULL,
  "cash_register" UUID,
  "amount"        DECIMAL(14, 2)  NOT NULL,
  "currency"      VARCHAR(3),
  "fx_rate"       DECIMAL(18, 8),
  "reason"        TEXT,
  "notes"         TEXT,
  "created_at"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)    NOT NULL,
  "deleted_at"    TIMESTAMP(3),

  CONSTRAINT "document_purchases_refund_received_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_purchases_refund_received_tenant_id_number_key"
  ON "document_purchases_refund_received" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_purchases_refund_received_t_idx" ON "document_purchases_refund_received" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_purchases_refund_received_t_deleted_idx" ON "document_purchases_refund_received" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_purchases_refund_received_t_status_idx" ON "document_purchases_refund_received" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_purchases_refund_received_t_posted_idx" ON "document_purchases_refund_received" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_purchases_refund_received_t_supplier_idx" ON "document_purchases_refund_received" ("tenant_id", "supplier");

CREATE TABLE IF NOT EXISTS "document_inventory_production_report" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "number"           TEXT         NOT NULL,
  "status"           TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"        TIMESTAMP(3),
  "posted_by"        UUID,
  "version"          INTEGER      NOT NULL DEFAULT 0,
  "date"             TIMESTAMP(3) NOT NULL,
  "warehouse"        UUID         NOT NULL,
  "finished_product" UUID         NOT NULL,
  "finished_qty"     INTEGER      NOT NULL,
  "notes"            TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,
  "deleted_at"       TIMESTAMP(3),

  CONSTRAINT "document_inventory_production_report_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_inventory_production_report_tenant_id_number_key"
  ON "document_inventory_production_report" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_inv_production_report_t_idx" ON "document_inventory_production_report" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_inv_production_report_t_deleted_idx" ON "document_inventory_production_report" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_inv_production_report_t_status_idx" ON "document_inventory_production_report" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_inv_production_report_t_posted_idx" ON "document_inventory_production_report" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_inv_production_report_t_warehouse_idx" ON "document_inventory_production_report" ("tenant_id", "warehouse");
CREATE INDEX IF NOT EXISTS "doc_inv_production_report_t_finished_idx" ON "document_inventory_production_report" ("tenant_id", "finished_product");

CREATE TABLE IF NOT EXISTS "document_line_inventory_production_report_materials" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "document_id" UUID         NOT NULL,
  "sequence"    INTEGER      NOT NULL,
  "product"     UUID         NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "doc_line_inv_prod_rep_mat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_inv_prod_rep_mat_t_d_s_key"
  ON "document_line_inventory_production_report_materials" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_inv_prod_rep_mat_t_idx"
  ON "document_line_inventory_production_report_materials" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_inv_prod_rep_mat_t_d_idx"
  ON "document_line_inventory_production_report_materials" ("tenant_id", "document_id");

-- RLS for all 5 new tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_treasury_cash_transfer',
    'document_sales_refund_payment',
    'document_purchases_refund_received',
    'document_inventory_production_report',
    'document_line_inventory_production_report_materials'
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
