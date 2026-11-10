-- Phase 7: workflow-status 1C documents (4 docs + 2 line tables).

CREATE TABLE IF NOT EXISTS "document_purchases_payment_request" (
  "id"              UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID            NOT NULL,
  "number"          TEXT            NOT NULL,
  "status"          TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"       TIMESTAMP(3),
  "posted_by"       UUID,
  "version"         INTEGER         NOT NULL DEFAULT 0,
  "date"            TIMESTAMP(3)    NOT NULL,
  "supplier"        UUID            NOT NULL,
  "amount"          DECIMAL(14, 2)  NOT NULL,
  "currency"        VARCHAR(3),
  "fx_rate"         DECIMAL(18, 8),
  "due_date"        TIMESTAMP(3),
  "workflow_status" TEXT            NOT NULL DEFAULT 'draft',
  "requested_by"    TEXT,
  "approved_by"     TEXT,
  "approved_at"     TIMESTAMP(3),
  "reason"          TEXT,
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)    NOT NULL,
  "deleted_at"      TIMESTAMP(3),
  CONSTRAINT "document_purchases_payment_request_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_purchases_payment_request_tenant_id_number_key"
  ON "document_purchases_payment_request" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_p_pr_t_idx" ON "document_purchases_payment_request" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_p_pr_t_d_idx" ON "document_purchases_payment_request" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_p_pr_t_s_idx" ON "document_purchases_payment_request" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_p_pr_t_ws_idx" ON "document_purchases_payment_request" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_p_pr_t_p_idx" ON "document_purchases_payment_request" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_p_pr_t_sup_idx" ON "document_purchases_payment_request" ("tenant_id", "supplier");
CREATE INDEX IF NOT EXISTS "doc_p_pr_t_due_idx" ON "document_purchases_payment_request" ("tenant_id", "due_date");

CREATE TABLE IF NOT EXISTS "document_sales_commercial_offer" (
  "id"              UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID            NOT NULL,
  "number"          TEXT            NOT NULL,
  "status"          TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"       TIMESTAMP(3),
  "posted_by"       UUID,
  "version"         INTEGER         NOT NULL DEFAULT 0,
  "date"            TIMESTAMP(3)    NOT NULL,
  "customer"        UUID            NOT NULL,
  "valid_until"     TIMESTAMP(3),
  "currency"        VARCHAR(3),
  "fx_rate"         DECIMAL(18, 8),
  "workflow_status" TEXT            NOT NULL DEFAULT 'draft',
  "assigned_rep_id" TEXT,
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)    NOT NULL,
  "deleted_at"      TIMESTAMP(3),
  CONSTRAINT "document_sales_commercial_offer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_sales_commercial_offer_tenant_id_number_key"
  ON "document_sales_commercial_offer" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_s_co_t_idx" ON "document_sales_commercial_offer" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_s_co_t_d_idx" ON "document_sales_commercial_offer" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_s_co_t_s_idx" ON "document_sales_commercial_offer" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_s_co_t_ws_idx" ON "document_sales_commercial_offer" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_s_co_t_p_idx" ON "document_sales_commercial_offer" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_s_co_t_cus_idx" ON "document_sales_commercial_offer" ("tenant_id", "customer");

CREATE TABLE IF NOT EXISTS "document_line_sales_commercial_offer_items" (
  "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID            NOT NULL,
  "document_id" UUID            NOT NULL,
  "sequence"    INTEGER         NOT NULL,
  "product"     UUID,
  "description" TEXT,
  "quantity"    INTEGER         NOT NULL DEFAULT 1,
  "price"       DECIMAL(14, 2)  NOT NULL,
  "created_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "doc_line_s_co_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_s_co_t_d_s_key"
  ON "document_line_sales_commercial_offer_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_s_co_t_idx" ON "document_line_sales_commercial_offer_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_s_co_t_d_idx" ON "document_line_sales_commercial_offer_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_treasury_payment_order" (
  "id"                   UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            UUID            NOT NULL,
  "number"               TEXT            NOT NULL,
  "status"               TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"            TIMESTAMP(3),
  "posted_by"            UUID,
  "version"              INTEGER         NOT NULL DEFAULT 0,
  "date"                 TIMESTAMP(3)    NOT NULL,
  "bank_account"         UUID            NOT NULL,
  "recipient_name"       TEXT            NOT NULL,
  "recipient_account_no" TEXT,
  "recipient_bic"        TEXT,
  "recipient_inn"        TEXT,
  "amount"               DECIMAL(14, 2)  NOT NULL,
  "currency"             VARCHAR(3),
  "fx_rate"              DECIMAL(18, 8),
  "purpose"              TEXT,
  "workflow_status"      TEXT            NOT NULL DEFAULT 'issued',
  "linked_request"       UUID,
  "notes"                TEXT,
  "created_at"           TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3)    NOT NULL,
  "deleted_at"           TIMESTAMP(3),
  CONSTRAINT "document_treasury_payment_order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_treasury_payment_order_tenant_id_number_key"
  ON "document_treasury_payment_order" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_t_po_t_idx" ON "document_treasury_payment_order" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_t_po_t_d_idx" ON "document_treasury_payment_order" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_t_po_t_s_idx" ON "document_treasury_payment_order" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_t_po_t_ws_idx" ON "document_treasury_payment_order" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_t_po_t_p_idx" ON "document_treasury_payment_order" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_t_po_t_ba_idx" ON "document_treasury_payment_order" ("tenant_id", "bank_account");

CREATE TABLE IF NOT EXISTS "document_inventory_material_request" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "number"          TEXT         NOT NULL,
  "status"          TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"       TIMESTAMP(3),
  "posted_by"       UUID,
  "version"         INTEGER      NOT NULL DEFAULT 0,
  "date"            TIMESTAMP(3) NOT NULL,
  "warehouse"       UUID         NOT NULL,
  "workflow_status" TEXT         NOT NULL DEFAULT 'draft',
  "requested_by"    TEXT,
  "reason"          TEXT,
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  "deleted_at"      TIMESTAMP(3),
  CONSTRAINT "document_inventory_material_request_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_inventory_material_request_tenant_id_number_key"
  ON "document_inventory_material_request" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_i_mr_t_idx" ON "document_inventory_material_request" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_i_mr_t_d_idx" ON "document_inventory_material_request" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_i_mr_t_s_idx" ON "document_inventory_material_request" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_i_mr_t_ws_idx" ON "document_inventory_material_request" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_i_mr_t_p_idx" ON "document_inventory_material_request" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_i_mr_t_w_idx" ON "document_inventory_material_request" ("tenant_id", "warehouse");

CREATE TABLE IF NOT EXISTS "document_line_inventory_material_request_items" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "document_id" UUID         NOT NULL,
  "sequence"    INTEGER      NOT NULL,
  "product"     UUID         NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doc_line_i_mr_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_i_mr_t_d_s_key"
  ON "document_line_inventory_material_request_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_i_mr_t_idx" ON "document_line_inventory_material_request_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_i_mr_t_d_idx" ON "document_line_inventory_material_request_items" ("tenant_id", "document_id");

-- RLS for all 6 new tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_purchases_payment_request',
    'document_sales_commercial_offer',
    'document_line_sales_commercial_offer_items',
    'document_treasury_payment_order',
    'document_inventory_material_request',
    'document_line_inventory_material_request_items'
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
