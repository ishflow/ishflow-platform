-- Phase 8: 4 operational 1C documents (8 tables: 4 headers + 4 lines).

CREATE TABLE IF NOT EXISTS "document_sales_delivery_note" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "number"          TEXT         NOT NULL,
  "status"          TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"       TIMESTAMP(3),
  "posted_by"       UUID,
  "version"         INTEGER      NOT NULL DEFAULT 0,
  "date"            TIMESTAMP(3) NOT NULL,
  "customer"        UUID         NOT NULL,
  "warehouse"       UUID         NOT NULL,
  "linked_invoice"  UUID,
  "driver_name"     TEXT,
  "vehicle_plate"   TEXT,
  "workflow_status" TEXT         NOT NULL DEFAULT 'issued',
  "assigned_rep_id" TEXT,
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  "deleted_at"      TIMESTAMP(3),
  CONSTRAINT "document_sales_delivery_note_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_sales_delivery_note_tenant_id_number_key"
  ON "document_sales_delivery_note" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_s_dn_t_idx" ON "document_sales_delivery_note" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_s_dn_t_d_idx" ON "document_sales_delivery_note" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_s_dn_t_s_idx" ON "document_sales_delivery_note" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_s_dn_t_ws_idx" ON "document_sales_delivery_note" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_s_dn_t_p_idx" ON "document_sales_delivery_note" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_s_dn_t_cus_idx" ON "document_sales_delivery_note" ("tenant_id", "customer");
CREATE INDEX IF NOT EXISTS "doc_s_dn_t_w_idx" ON "document_sales_delivery_note" ("tenant_id", "warehouse");
CREATE INDEX IF NOT EXISTS "doc_s_dn_t_li_idx" ON "document_sales_delivery_note" ("tenant_id", "linked_invoice");

CREATE TABLE IF NOT EXISTS "document_line_sales_delivery_note_items" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "document_id" UUID         NOT NULL,
  "sequence"    INTEGER      NOT NULL,
  "product"     UUID         NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doc_line_s_dn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_s_dn_t_d_s_key"
  ON "document_line_sales_delivery_note_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_s_dn_t_idx" ON "document_line_sales_delivery_note_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_s_dn_t_d_idx" ON "document_line_sales_delivery_note_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_purchases_receipt_act" (
  "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID         NOT NULL,
  "number"            TEXT         NOT NULL,
  "status"            TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"         TIMESTAMP(3),
  "posted_by"         UUID,
  "version"           INTEGER      NOT NULL DEFAULT 0,
  "date"              TIMESTAMP(3) NOT NULL,
  "supplier"          UUID         NOT NULL,
  "warehouse"         UUID         NOT NULL,
  "linked_invoice"    UUID,
  "inspector_name"    TEXT,
  "acceptance_notes"  TEXT,
  "workflow_status"   TEXT         NOT NULL DEFAULT 'draft',
  "assigned_buyer_id" UUID,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  "deleted_at"        TIMESTAMP(3),
  CONSTRAINT "document_purchases_receipt_act_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_purchases_receipt_act_tenant_id_number_key"
  ON "document_purchases_receipt_act" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_p_ra_t_idx" ON "document_purchases_receipt_act" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_p_ra_t_d_idx" ON "document_purchases_receipt_act" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_p_ra_t_s_idx" ON "document_purchases_receipt_act" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_p_ra_t_ws_idx" ON "document_purchases_receipt_act" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_p_ra_t_p_idx" ON "document_purchases_receipt_act" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_p_ra_t_sup_idx" ON "document_purchases_receipt_act" ("tenant_id", "supplier");
CREATE INDEX IF NOT EXISTS "doc_p_ra_t_w_idx" ON "document_purchases_receipt_act" ("tenant_id", "warehouse");
CREATE INDEX IF NOT EXISTS "doc_p_ra_t_li_idx" ON "document_purchases_receipt_act" ("tenant_id", "linked_invoice");

CREATE TABLE IF NOT EXISTS "document_line_purchases_receipt_act_items" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "document_id"      UUID         NOT NULL,
  "sequence"         INTEGER      NOT NULL,
  "product"          UUID         NOT NULL,
  "expected_qty"     INTEGER      NOT NULL,
  "accepted_qty"     INTEGER      NOT NULL,
  "discrepancy_note" TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doc_line_p_ra_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_p_ra_t_d_s_key"
  ON "document_line_purchases_receipt_act_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_p_ra_t_idx" ON "document_line_purchases_receipt_act_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_p_ra_t_d_idx" ON "document_line_purchases_receipt_act_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_inventory_write_off_act" (
  "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID         NOT NULL,
  "number"             TEXT         NOT NULL,
  "status"             TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"          TIMESTAMP(3),
  "posted_by"          UUID,
  "version"            INTEGER      NOT NULL DEFAULT 0,
  "date"               TIMESTAMP(3) NOT NULL,
  "warehouse"          UUID         NOT NULL,
  "reason_code"        TEXT,
  "reason"             TEXT,
  "commission_members" TEXT,
  "workflow_status"    TEXT         NOT NULL DEFAULT 'draft',
  "approved_by"        TEXT,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  "deleted_at"         TIMESTAMP(3),
  CONSTRAINT "document_inventory_write_off_act_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_inventory_write_off_act_tenant_id_number_key"
  ON "document_inventory_write_off_act" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_i_woa_t_idx" ON "document_inventory_write_off_act" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_i_woa_t_d_idx" ON "document_inventory_write_off_act" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_i_woa_t_s_idx" ON "document_inventory_write_off_act" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_i_woa_t_ws_idx" ON "document_inventory_write_off_act" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_i_woa_t_p_idx" ON "document_inventory_write_off_act" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_i_woa_t_w_idx" ON "document_inventory_write_off_act" ("tenant_id", "warehouse");
CREATE INDEX IF NOT EXISTS "doc_i_woa_t_rc_idx" ON "document_inventory_write_off_act" ("tenant_id", "reason_code");

CREATE TABLE IF NOT EXISTS "document_line_inventory_write_off_act_items" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "document_id" UUID         NOT NULL,
  "sequence"    INTEGER      NOT NULL,
  "product"     UUID         NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doc_line_i_woa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_i_woa_t_d_s_key"
  ON "document_line_inventory_write_off_act_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_i_woa_t_idx" ON "document_line_inventory_write_off_act_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_i_woa_t_d_idx" ON "document_line_inventory_write_off_act_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_inventory_repricing" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "number"          TEXT         NOT NULL,
  "status"          TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"       TIMESTAMP(3),
  "posted_by"       UUID,
  "version"         INTEGER      NOT NULL DEFAULT 0,
  "date"            TIMESTAMP(3) NOT NULL,
  "warehouse"       UUID         NOT NULL,
  "reason"          TEXT,
  "workflow_status" TEXT         NOT NULL DEFAULT 'draft',
  "approved_by"     TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  "deleted_at"      TIMESTAMP(3),
  CONSTRAINT "document_inventory_repricing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_inventory_repricing_tenant_id_number_key"
  ON "document_inventory_repricing" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_i_rep_t_idx" ON "document_inventory_repricing" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_i_rep_t_d_idx" ON "document_inventory_repricing" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_i_rep_t_s_idx" ON "document_inventory_repricing" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_i_rep_t_ws_idx" ON "document_inventory_repricing" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "doc_i_rep_t_p_idx" ON "document_inventory_repricing" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_i_rep_t_w_idx" ON "document_inventory_repricing" ("tenant_id", "warehouse");

CREATE TABLE IF NOT EXISTS "document_line_inventory_repricing_items" (
  "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID            NOT NULL,
  "document_id" UUID            NOT NULL,
  "sequence"    INTEGER         NOT NULL,
  "product"     UUID            NOT NULL,
  "old_cost"    DECIMAL(14, 2)  NOT NULL,
  "new_cost"    DECIMAL(14, 2)  NOT NULL,
  "created_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "doc_line_i_rep_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_i_rep_t_d_s_key"
  ON "document_line_inventory_repricing_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_i_rep_t_idx" ON "document_line_inventory_repricing_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_i_rep_t_d_idx" ON "document_line_inventory_repricing_items" ("tenant_id", "document_id");

-- RLS for all 8 new tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_sales_delivery_note',
    'document_line_sales_delivery_note_items',
    'document_purchases_receipt_act',
    'document_line_purchases_receipt_act_items',
    'document_inventory_write_off_act',
    'document_line_inventory_write_off_act_items',
    'document_inventory_repricing',
    'document_line_inventory_repricing_items'
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
