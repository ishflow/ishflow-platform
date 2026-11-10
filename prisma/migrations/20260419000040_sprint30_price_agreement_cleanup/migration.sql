-- Sprint 30 cleanup: price_agreement now serves as CustomerSpecialPrices layer
-- in the 1C 4-layer resolver. Shed the scored-chain columns and enforce the
-- correct shape: (customer, product) are required, fixedPrice is required,
-- and (tenant, customer, product, validFrom) is unique to prevent duplicate
-- overrides.

-- No data exists yet; destructive column drops are safe.

ALTER TABLE catalog_sales_price_agreement
  DROP COLUMN "markupPct",
  DROP COLUMN priority;

ALTER TABLE catalog_sales_price_agreement
  ALTER COLUMN counterparty SET NOT NULL,
  ALTER COLUMN product SET NOT NULL,
  ALTER COLUMN "fixedPrice" SET NOT NULL;

CREATE UNIQUE INDEX catalog_sales_price_agreement_unique_cust_prod_from
  ON catalog_sales_price_agreement ("tenant_id", counterparty, product, "validFrom");

-- Drop the stale resolver index that listed dropped columns in its key.
DROP INDEX IF EXISTS catalog_sales_price_agreement_resolver_idx;

-- New tighter resolver index for layer-1 lookup: (tenant, customer, product, validFrom DESC).
CREATE INDEX IF NOT EXISTS catalog_sales_price_agreement_customer_product_idx
  ON catalog_sales_price_agreement ("tenant_id", counterparty, product, "validFrom" DESC);
