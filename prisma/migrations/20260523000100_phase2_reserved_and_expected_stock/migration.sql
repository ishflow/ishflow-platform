-- Phase 2: reserved_stock + expected_stock accumulation registers.

CREATE TABLE IF NOT EXISTS "movement_sales_reserved_stock" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "doc_ref"     UUID         NOT NULL,
  "doc_type"    TEXT         NOT NULL,
  "kind"        TEXT         NOT NULL,
  "active"      BOOLEAN      NOT NULL DEFAULT TRUE,
  "timestamp"   TIMESTAMP(3) NOT NULL,
  "warehouse"   UUID         NOT NULL,
  "product"     UUID         NOT NULL,
  "customer"    UUID         NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "movement_sales_reserved_stock_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "movement_sales_reserved_stock_tenant_id_idx" ON "movement_sales_reserved_stock" ("tenant_id");
CREATE INDEX IF NOT EXISTS "movement_sales_reserved_stock_tenant_id_active_idx" ON "movement_sales_reserved_stock" ("tenant_id", "active");
CREATE INDEX IF NOT EXISTS "movement_sales_reserved_stock_tenant_id_doc_ref_idx" ON "movement_sales_reserved_stock" ("tenant_id", "doc_ref");
CREATE INDEX IF NOT EXISTS "movement_sales_reserved_stock_tenant_id_active_warehouse_product_idx"
  ON "movement_sales_reserved_stock" ("tenant_id", "active", "warehouse", "product");
CREATE INDEX IF NOT EXISTS "movement_sales_reserved_stock_tenant_id_active_customer_ts_idx"
  ON "movement_sales_reserved_stock" ("tenant_id", "active", "customer", "timestamp");

CREATE TABLE IF NOT EXISTS "movement_purchases_expected_stock" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "doc_ref"     UUID         NOT NULL,
  "doc_type"    TEXT         NOT NULL,
  "kind"        TEXT         NOT NULL,
  "active"      BOOLEAN      NOT NULL DEFAULT TRUE,
  "timestamp"   TIMESTAMP(3) NOT NULL,
  "warehouse"   UUID         NOT NULL,
  "product"     UUID         NOT NULL,
  "supplier"    UUID         NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "movement_purchases_expected_stock_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "movement_purchases_expected_stock_tenant_id_idx" ON "movement_purchases_expected_stock" ("tenant_id");
CREATE INDEX IF NOT EXISTS "movement_purchases_expected_stock_tenant_id_active_idx" ON "movement_purchases_expected_stock" ("tenant_id", "active");
CREATE INDEX IF NOT EXISTS "movement_purchases_expected_stock_tenant_id_doc_ref_idx" ON "movement_purchases_expected_stock" ("tenant_id", "doc_ref");
CREATE INDEX IF NOT EXISTS "movement_purchases_expected_stock_tenant_id_active_warehouse_product_idx"
  ON "movement_purchases_expected_stock" ("tenant_id", "active", "warehouse", "product");
CREATE INDEX IF NOT EXISTS "movement_purchases_expected_stock_tenant_id_active_supplier_ts_idx"
  ON "movement_purchases_expected_stock" ("tenant_id", "active", "supplier", "timestamp");
