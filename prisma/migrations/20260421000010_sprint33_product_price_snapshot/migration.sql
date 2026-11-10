-- Sprint 33 T1: repurpose product_price as cost snapshot.
-- priceType + price (per-tier price list) removed; unitCost (cost snapshot) added.
-- Data loss: any existing rows lose their priceType binding. Dev DB was fresh.

DELETE FROM catalog_inventory_product_price;

ALTER TABLE catalog_inventory_product_price
  DROP COLUMN "priceType",
  DROP COLUMN "price",
  ADD COLUMN "unitCost" NUMERIC(14, 2) NOT NULL;

CREATE INDEX IF NOT EXISTS "catalog_inventory_product_price_tenant_id_product_validFrom_idx"
  ON catalog_inventory_product_price ("tenant_id", "product", "validFrom");
