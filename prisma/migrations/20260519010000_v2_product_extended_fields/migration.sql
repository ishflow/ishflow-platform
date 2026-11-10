-- V0.8: extend product master with display + default fields.
-- All columns NULLABLE — no NOT NULL DEFAULT to keep online DDL fast on Neon.
-- RLS policy on catalog_inventory_product unchanged (additive columns).

ALTER TABLE "catalog_inventory_product"
  ADD COLUMN "unit"        TEXT,
  ADD COLUMN "cost_price"  NUMERIC(14, 2),
  ADD COLUMN "list_price"  NUMERIC(14, 2),
  ADD COLUMN "min_stock"   NUMERIC(14, 3),
  ADD COLUMN "max_stock"   NUMERIC(14, 3),
  ADD COLUMN "description" TEXT;
