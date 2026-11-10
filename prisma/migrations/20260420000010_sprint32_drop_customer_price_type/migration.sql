-- Sprint 32 T4: drop customer-level priceType default (misleading; pricing now
-- relies on Layer 1 agreement override or Layer 2 tenant default markup).
DROP INDEX IF EXISTS catalog_sales_customer_tenant_id_priceType_idx;
ALTER TABLE catalog_sales_customer DROP COLUMN IF EXISTS "priceType";
