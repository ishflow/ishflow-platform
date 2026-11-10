-- Sprint 19: warehouse dimension on stock_balance
-- 1) Create the warehouse catalog table.
-- 2) Seed one default warehouse row per tenant that already has stock.
-- 3) Add the warehouse column on movement_inventory_stock_balance + line tables as NULLABLE.
-- 4) Backfill existing rows to the per-tenant default warehouse.
-- 5) Tighten to NOT NULL + add composite indexes.

-- (a) catalog_inventory_warehouse table.
CREATE TABLE IF NOT EXISTS catalog_inventory_warehouse (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  code        VARCHAR(16) NOT NULL,
  name        TEXT NOT NULL,
  address     TEXT,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP(3) NOT NULL,
  deleted_at  TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_inventory_warehouse_tenant_id_code_key
  ON catalog_inventory_warehouse(tenant_id, code);
CREATE INDEX IF NOT EXISTS catalog_inventory_warehouse_tenant_id_idx
  ON catalog_inventory_warehouse(tenant_id);
CREATE INDEX IF NOT EXISTS catalog_inventory_warehouse_tenant_id_deleted_at_idx
  ON catalog_inventory_warehouse(tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS catalog_inventory_warehouse_tenant_id_created_at_idx
  ON catalog_inventory_warehouse(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS catalog_inventory_warehouse_tenant_id_name_idx
  ON catalog_inventory_warehouse(tenant_id, name);

-- (b) seed a default warehouse for every existing tenant that has any stock movement.
INSERT INTO catalog_inventory_warehouse (tenant_id, code, name, updated_at)
SELECT DISTINCT m.tenant_id, 'MAIN', 'Главный склад', CURRENT_TIMESTAMP
FROM movement_inventory_stock_balance m
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Also seed for tenants that have document lines but no movement rows yet.
INSERT INTO catalog_inventory_warehouse (tenant_id, code, name, updated_at)
SELECT DISTINCT l.tenant_id, 'MAIN', 'Главный склад', CURRENT_TIMESTAMP
FROM document_line_purchases_invoice_items l
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO catalog_inventory_warehouse (tenant_id, code, name, updated_at)
SELECT DISTINCT l.tenant_id, 'MAIN', 'Главный склад', CURRENT_TIMESTAMP
FROM document_line_sales_invoice_items l
ON CONFLICT (tenant_id, code) DO NOTHING;

-- (c) warehouse column on movements — NULLABLE first.
ALTER TABLE movement_inventory_stock_balance
  ADD COLUMN IF NOT EXISTS warehouse UUID;

-- (d) backfill movement warehouse to the tenant's MAIN warehouse.
UPDATE movement_inventory_stock_balance m
SET warehouse = w.id
FROM catalog_inventory_warehouse w
WHERE w.tenant_id = m.tenant_id AND w.code = 'MAIN' AND m.warehouse IS NULL;

-- (e) lock to NOT NULL + add index.
ALTER TABLE movement_inventory_stock_balance
  ALTER COLUMN warehouse SET NOT NULL;

DROP INDEX IF EXISTS movement_inventory_stock_balance_tenant_id_product_timestamp_idx;
CREATE INDEX IF NOT EXISTS movement_inventory_stock_balance_tenant_wh_prod_ts_idx
  ON movement_inventory_stock_balance(tenant_id, warehouse, product, timestamp);

-- (f) add warehouse column on both line tables, nullable → backfill → NOT NULL.
ALTER TABLE document_line_purchases_invoice_items
  ADD COLUMN IF NOT EXISTS warehouse UUID;
UPDATE document_line_purchases_invoice_items l
SET warehouse = w.id
FROM catalog_inventory_warehouse w
WHERE w.tenant_id = l.tenant_id AND w.code = 'MAIN' AND l.warehouse IS NULL;
ALTER TABLE document_line_purchases_invoice_items
  ALTER COLUMN warehouse SET NOT NULL;

ALTER TABLE document_line_sales_invoice_items
  ADD COLUMN IF NOT EXISTS warehouse UUID;
UPDATE document_line_sales_invoice_items l
SET warehouse = w.id
FROM catalog_inventory_warehouse w
WHERE w.tenant_id = l.tenant_id AND w.code = 'MAIN' AND l.warehouse IS NULL;
ALTER TABLE document_line_sales_invoice_items
  ALTER COLUMN warehouse SET NOT NULL;
