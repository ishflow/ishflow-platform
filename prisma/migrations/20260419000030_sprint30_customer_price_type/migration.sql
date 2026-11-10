-- Sprint 30 (1C alignment): Customer.priceType default reference.
-- Nullable — customers without a type fall back to tenant default markup.
ALTER TABLE catalog_sales_customer
  ADD COLUMN "priceType" UUID;

-- Support lookup by (tenant, priceType) for inverse navigation ("all VIP customers").
CREATE INDEX IF NOT EXISTS catalog_sales_customer_tenant_id_priceType_idx
  ON catalog_sales_customer ("tenant_id", "priceType");
