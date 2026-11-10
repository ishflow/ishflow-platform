-- Sprint 31: add optional validTo column to catalog_inventory_product_price.
-- NULL means open-ended validity; resolver untouched this sprint (data-only).
ALTER TABLE catalog_inventory_product_price
  ADD COLUMN "validTo" TIMESTAMP(3);
