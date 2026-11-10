-- Multi-currency: additive columns on movement + register + tenant + fx_rate tables.
-- All ADD COLUMN (nullable, or with safe default). No drops, no type changes.

ALTER TABLE "fx_rate"
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(8) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "tenant"
  ADD COLUMN IF NOT EXISTS "fx_sources" JSONB;

ALTER TABLE "movement_sales_sale"
  ADD COLUMN IF NOT EXISTS "revenue_original"  DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "cost_original"     DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "currency_original" VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "fx_rate"           DECIMAL(18, 8);

ALTER TABLE "movement_inventory_stock_balance"
  ADD COLUMN IF NOT EXISTS "total_cost_original" DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "currency_original"   VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "fx_rate"             DECIMAL(18, 8);

ALTER TABLE "movement_sales_accounts_receivable"
  ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(18, 8);

ALTER TABLE "movement_purchases_accounts_payable"
  ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(18, 8);

ALTER TABLE "register_inventory_product_price"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3);
