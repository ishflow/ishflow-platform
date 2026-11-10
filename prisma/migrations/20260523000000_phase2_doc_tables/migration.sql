-- Phase 2: 4 additional 1C documents — header + line tables.

CREATE TABLE IF NOT EXISTS "document_sales_order" (
  "id"               UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID            NOT NULL,
  "number"           TEXT            NOT NULL,
  "status"           TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"        TIMESTAMP(3),
  "posted_by"        UUID,
  "version"          INTEGER         NOT NULL DEFAULT 0,
  "date"             TIMESTAMP(3)    NOT NULL,
  "customer"         UUID            NOT NULL,
  "warehouse"        UUID            NOT NULL,
  "currency"         VARCHAR(3),
  "fx_rate"          DECIMAL(18, 8),
  "expected_date"    TIMESTAMP(3),
  "workflow_status"  TEXT            NOT NULL DEFAULT 'open',
  "assigned_rep_id"  TEXT,
  "notes"            TEXT,
  "created_at"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3)    NOT NULL,
  "deleted_at"       TIMESTAMP(3),

  CONSTRAINT "document_sales_order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_sales_order_tenant_id_number_key"
  ON "document_sales_order" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_sales_order_tenant_id_idx" ON "document_sales_order" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_sales_order_tenant_id_deleted_at_idx" ON "document_sales_order" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_sales_order_tenant_id_status_idx" ON "document_sales_order" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_sales_order_tenant_id_posted_at_idx" ON "document_sales_order" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_sales_order_tenant_id_created_at_idx" ON "document_sales_order" ("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "document_sales_order_tenant_id_workflow_status_idx" ON "document_sales_order" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "document_sales_order_tenant_id_customer_idx" ON "document_sales_order" ("tenant_id", "customer");

CREATE TABLE IF NOT EXISTS "document_line_sales_order_items" (
  "id"           UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID            NOT NULL,
  "document_id"  UUID            NOT NULL,
  "sequence"     INTEGER         NOT NULL,
  "product"      UUID            NOT NULL,
  "quantity"     INTEGER         NOT NULL,
  "price"        DECIMAL(14, 2)  NOT NULL,
  "created_at"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "document_line_sales_order_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_line_sales_order_items_tenant_doc_seq_key"
  ON "document_line_sales_order_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "document_line_sales_order_items_tenant_id_idx" ON "document_line_sales_order_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_line_sales_order_items_tenant_id_document_id_idx" ON "document_line_sales_order_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_sales_invoice_for_payment" (
  "id"                  UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID            NOT NULL,
  "number"              TEXT            NOT NULL,
  "status"              TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"           TIMESTAMP(3),
  "posted_by"           UUID,
  "version"             INTEGER         NOT NULL DEFAULT 0,
  "date"                TIMESTAMP(3)    NOT NULL,
  "customer"            UUID            NOT NULL,
  "currency"            VARCHAR(3),
  "fx_rate"             DECIMAL(18, 8),
  "due_date"            TIMESTAMP(3),
  "workflow_status"     TEXT            NOT NULL DEFAULT 'issued',
  "assigned_rep_id"     TEXT,
  "linked_sales_order"  UUID,
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)    NOT NULL,
  "deleted_at"          TIMESTAMP(3),

  CONSTRAINT "document_sales_invoice_for_payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_sales_invoice_for_payment_tenant_id_number_key"
  ON "document_sales_invoice_for_payment" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_sales_invoice_for_payment_tenant_id_idx" ON "document_sales_invoice_for_payment" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_sales_invoice_for_payment_tenant_id_deleted_at_idx" ON "document_sales_invoice_for_payment" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_sales_invoice_for_payment_tenant_id_status_idx" ON "document_sales_invoice_for_payment" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_sales_invoice_for_payment_tenant_id_workflow_status_idx" ON "document_sales_invoice_for_payment" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "document_sales_invoice_for_payment_tenant_id_posted_at_idx" ON "document_sales_invoice_for_payment" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_sales_invoice_for_payment_tenant_id_customer_idx" ON "document_sales_invoice_for_payment" ("tenant_id", "customer");
CREATE INDEX IF NOT EXISTS "document_sales_invoice_for_payment_tenant_id_linked_sales_order_idx" ON "document_sales_invoice_for_payment" ("tenant_id", "linked_sales_order");

CREATE TABLE IF NOT EXISTS "document_line_sales_invoice_for_payment_items" (
  "id"           UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID            NOT NULL,
  "document_id"  UUID            NOT NULL,
  "sequence"     INTEGER         NOT NULL,
  "product"      UUID,
  "description"  TEXT,
  "quantity"     INTEGER         NOT NULL,
  "price"        DECIMAL(14, 2)  NOT NULL,
  "created_at"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "document_line_sales_invoice_for_payment_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_line_sales_invoice_for_payment_items_tenant_doc_seq_key"
  ON "document_line_sales_invoice_for_payment_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "document_line_sales_invoice_for_payment_items_tenant_id_idx" ON "document_line_sales_invoice_for_payment_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_line_sales_invoice_for_payment_items_tenant_doc_idx" ON "document_line_sales_invoice_for_payment_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_purchases_order" (
  "id"                  UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID            NOT NULL,
  "number"              TEXT            NOT NULL,
  "status"              TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"           TIMESTAMP(3),
  "posted_by"           UUID,
  "version"             INTEGER         NOT NULL DEFAULT 0,
  "date"                TIMESTAMP(3)    NOT NULL,
  "supplier"            UUID            NOT NULL,
  "warehouse"           UUID            NOT NULL,
  "currency"            VARCHAR(3),
  "fx_rate"             DECIMAL(18, 8),
  "expected_date"       TIMESTAMP(3),
  "workflow_status"     TEXT            NOT NULL DEFAULT 'open',
  "assigned_buyer_id"   UUID,
  "supplier_doc_no"     TEXT,
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)    NOT NULL,
  "deleted_at"          TIMESTAMP(3),

  CONSTRAINT "document_purchases_order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_purchases_order_tenant_id_number_key"
  ON "document_purchases_order" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_purchases_order_tenant_id_idx" ON "document_purchases_order" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_purchases_order_tenant_id_deleted_at_idx" ON "document_purchases_order" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_purchases_order_tenant_id_status_idx" ON "document_purchases_order" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_purchases_order_tenant_id_workflow_status_idx" ON "document_purchases_order" ("tenant_id", "workflow_status");
CREATE INDEX IF NOT EXISTS "document_purchases_order_tenant_id_posted_at_idx" ON "document_purchases_order" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_purchases_order_tenant_id_supplier_idx" ON "document_purchases_order" ("tenant_id", "supplier");

CREATE TABLE IF NOT EXISTS "document_line_purchases_order_items" (
  "id"           UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID            NOT NULL,
  "document_id"  UUID            NOT NULL,
  "sequence"     INTEGER         NOT NULL,
  "product"      UUID            NOT NULL,
  "quantity"     INTEGER         NOT NULL,
  "price"        DECIMAL(14, 2)  NOT NULL,
  "created_at"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "document_line_purchases_order_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_line_purchases_order_items_tenant_doc_seq_key"
  ON "document_line_purchases_order_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "document_line_purchases_order_items_tenant_id_idx" ON "document_line_purchases_order_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_line_purchases_order_items_tenant_doc_idx" ON "document_line_purchases_order_items" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_treasury_debt_adjustment" (
  "id"                    UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             UUID            NOT NULL,
  "number"                TEXT            NOT NULL,
  "status"                TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"             TIMESTAMP(3),
  "posted_by"             UUID,
  "version"               INTEGER         NOT NULL DEFAULT 0,
  "date"                  TIMESTAMP(3)    NOT NULL,
  "kind"                  TEXT            NOT NULL,
  "counterparty"          UUID            NOT NULL,
  "counterparty_kind"     TEXT            NOT NULL,
  "counterparty_to"       UUID,
  "counterparty_to_kind"  TEXT,
  "currency"              VARCHAR(3),
  "fx_rate"               DECIMAL(18, 8),
  "reason"                TEXT,
  "created_at"            TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3)    NOT NULL,
  "deleted_at"            TIMESTAMP(3),

  CONSTRAINT "document_treasury_debt_adjustment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_treasury_debt_adjustment_tenant_id_number_key"
  ON "document_treasury_debt_adjustment" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_treasury_debt_adjustment_tenant_id_idx" ON "document_treasury_debt_adjustment" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_treasury_debt_adjustment_tenant_id_deleted_at_idx" ON "document_treasury_debt_adjustment" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_treasury_debt_adjustment_tenant_id_status_idx" ON "document_treasury_debt_adjustment" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_treasury_debt_adjustment_tenant_id_posted_at_idx" ON "document_treasury_debt_adjustment" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_treasury_debt_adjustment_tenant_id_counterparty_idx" ON "document_treasury_debt_adjustment" ("tenant_id", "counterparty");

CREATE TABLE IF NOT EXISTS "document_line_treasury_debt_adjustment_items" (
  "id"                  UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID            NOT NULL,
  "document_id"         UUID            NOT NULL,
  "sequence"            INTEGER         NOT NULL,
  "original_doc_ref"    UUID            NOT NULL,
  "original_doc_type"   TEXT            NOT NULL,
  "amount_original"     DECIMAL(14, 2)  NOT NULL,
  "created_at"          TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "document_line_treasury_debt_adjustment_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_line_treasury_debt_adjustment_items_tenant_doc_seq_key"
  ON "document_line_treasury_debt_adjustment_items" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "document_line_treasury_debt_adjustment_items_tenant_id_idx" ON "document_line_treasury_debt_adjustment_items" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_line_treasury_debt_adjustment_items_tenant_doc_idx" ON "document_line_treasury_debt_adjustment_items" ("tenant_id", "document_id");
