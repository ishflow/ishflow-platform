-- Phase 6: bank funds register + 3 bank documents.

CREATE TABLE IF NOT EXISTS "movement_treasury_bank_funds" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "doc_ref"         UUID         NOT NULL,
  "doc_type"        TEXT         NOT NULL,
  "kind"            TEXT         NOT NULL,
  "active"          BOOLEAN      NOT NULL DEFAULT TRUE,
  "timestamp"       TIMESTAMP(3) NOT NULL,
  "bank_account"    UUID         NOT NULL,
  "related_doc_ref" UUID,
  "amount"          DECIMAL(14, 2) NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movement_treasury_bank_funds_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "mov_t_bank_funds_t_idx" ON "movement_treasury_bank_funds" ("tenant_id");
CREATE INDEX IF NOT EXISTS "mov_t_bank_funds_t_a_idx" ON "movement_treasury_bank_funds" ("tenant_id", "active");
CREATE INDEX IF NOT EXISTS "mov_t_bank_funds_t_dr_idx" ON "movement_treasury_bank_funds" ("tenant_id", "doc_ref");
CREATE INDEX IF NOT EXISTS "mov_t_bank_funds_t_a_ts_idx" ON "movement_treasury_bank_funds" ("tenant_id", "active", "timestamp");
CREATE INDEX IF NOT EXISTS "mov_t_bank_funds_t_ba_ts_idx" ON "movement_treasury_bank_funds" ("tenant_id", "bank_account", "timestamp");

CREATE TABLE IF NOT EXISTS "document_purchases_bank_payment" (
  "id"                UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID            NOT NULL,
  "number"            TEXT            NOT NULL,
  "status"            TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"         TIMESTAMP(3),
  "posted_by"         UUID,
  "version"           INTEGER         NOT NULL DEFAULT 0,
  "date"              TIMESTAMP(3)    NOT NULL,
  "supplier"          UUID            NOT NULL,
  "bank_account"      UUID            NOT NULL,
  "amount"            DECIMAL(14, 2)  NOT NULL,
  "currency"          VARCHAR(3),
  "fx_rate"           DECIMAL(18, 8),
  "linked_invoices"   TEXT,
  "notes"             TEXT,
  "assigned_buyer_id" UUID,
  "created_at"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)    NOT NULL,
  "deleted_at"        TIMESTAMP(3),
  CONSTRAINT "document_purchases_bank_payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_purchases_bank_payment_tenant_id_number_key"
  ON "document_purchases_bank_payment" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_p_bank_pay_t_idx" ON "document_purchases_bank_payment" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_p_bank_pay_t_d_idx" ON "document_purchases_bank_payment" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_p_bank_pay_t_s_idx" ON "document_purchases_bank_payment" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_p_bank_pay_t_p_idx" ON "document_purchases_bank_payment" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_p_bank_pay_t_sup_idx" ON "document_purchases_bank_payment" ("tenant_id", "supplier");
CREATE INDEX IF NOT EXISTS "doc_p_bank_pay_t_ba_idx" ON "document_purchases_bank_payment" ("tenant_id", "bank_account");

CREATE TABLE IF NOT EXISTS "document_sales_bank_receipt" (
  "id"              UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID            NOT NULL,
  "number"          TEXT            NOT NULL,
  "status"          TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"       TIMESTAMP(3),
  "posted_by"       UUID,
  "version"         INTEGER         NOT NULL DEFAULT 0,
  "date"            TIMESTAMP(3)    NOT NULL,
  "customer"        UUID            NOT NULL,
  "bank_account"    UUID            NOT NULL,
  "amount"          DECIMAL(14, 2)  NOT NULL,
  "currency"        VARCHAR(3),
  "fx_rate"         DECIMAL(18, 8),
  "linked_invoices" TEXT,
  "notes"           TEXT,
  "assigned_rep_id" TEXT,
  "created_at"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)    NOT NULL,
  "deleted_at"      TIMESTAMP(3),
  CONSTRAINT "document_sales_bank_receipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_sales_bank_receipt_tenant_id_number_key"
  ON "document_sales_bank_receipt" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_s_bank_rcp_t_idx" ON "document_sales_bank_receipt" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_s_bank_rcp_t_d_idx" ON "document_sales_bank_receipt" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_s_bank_rcp_t_s_idx" ON "document_sales_bank_receipt" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_s_bank_rcp_t_p_idx" ON "document_sales_bank_receipt" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_s_bank_rcp_t_cus_idx" ON "document_sales_bank_receipt" ("tenant_id", "customer");
CREATE INDEX IF NOT EXISTS "doc_s_bank_rcp_t_ba_idx" ON "document_sales_bank_receipt" ("tenant_id", "bank_account");

CREATE TABLE IF NOT EXISTS "document_treasury_bank_transfer" (
  "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID            NOT NULL,
  "number"      TEXT            NOT NULL,
  "status"      TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"   TIMESTAMP(3),
  "posted_by"   UUID,
  "version"     INTEGER         NOT NULL DEFAULT 0,
  "date"        TIMESTAMP(3)    NOT NULL,
  "from_bank"   UUID            NOT NULL,
  "to_bank"     UUID            NOT NULL,
  "amount"      DECIMAL(14, 2)  NOT NULL,
  "currency"    VARCHAR(3),
  "fx_rate"     DECIMAL(18, 8),
  "notes"       TEXT,
  "created_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)    NOT NULL,
  "deleted_at"  TIMESTAMP(3),
  CONSTRAINT "document_treasury_bank_transfer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_treasury_bank_transfer_tenant_id_number_key"
  ON "document_treasury_bank_transfer" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_t_bank_xfer_t_idx" ON "document_treasury_bank_transfer" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_t_bank_xfer_t_d_idx" ON "document_treasury_bank_transfer" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_t_bank_xfer_t_s_idx" ON "document_treasury_bank_transfer" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_t_bank_xfer_t_p_idx" ON "document_treasury_bank_transfer" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_t_bank_xfer_t_fb_idx" ON "document_treasury_bank_transfer" ("tenant_id", "from_bank");
CREATE INDEX IF NOT EXISTS "doc_t_bank_xfer_t_tb_idx" ON "document_treasury_bank_transfer" ("tenant_id", "to_bank");

-- RLS for all 4 new tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'movement_treasury_bank_funds',
    'document_purchases_bank_payment',
    'document_sales_bank_receipt',
    'document_treasury_bank_transfer'
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
