-- Sprint 21: multi-currency.
-- 1) fx_rate table.
-- 2) Add `currency` column on the four money-bearing documents (nullable -> backfill -> NOT NULL).
-- 3) Add amount_original + currency_original resources on A/R and A/P movements.

-- (1) fx_rate table.
CREATE TABLE IF NOT EXISTS fx_rate (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  base        VARCHAR(3) NOT NULL,
  quote       VARCHAR(3) NOT NULL,
  date        DATE NOT NULL,
  rate        DECIMAL(18, 8) NOT NULL,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP(3) NOT NULL,
  CONSTRAINT fx_rate_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS fx_rate_tenant_base_quote_date_uq
  ON fx_rate(tenant_id, base, quote, date);
CREATE INDEX IF NOT EXISTS fx_rate_tenant_base_quote_date_idx
  ON fx_rate(tenant_id, base, quote, date);

-- (2) currency on money-bearing documents.
ALTER TABLE document_purchases_invoice        ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE document_sales_invoice            ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE document_purchases_payment_sent   ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE document_sales_payment_received   ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

-- Backfill from tenant.currency (table is `tenant`, not `tenants`).
-- Some rows may point to already-deleted tenants (test cleanup artefacts);
-- fall back to 'USD' for any remaining nulls so the NOT NULL constraint can apply.
UPDATE document_purchases_invoice d SET currency = COALESCE(t.currency, 'USD')
  FROM tenant t WHERE t.id = d.tenant_id AND d.currency IS NULL;
UPDATE document_purchases_invoice SET currency = 'USD' WHERE currency IS NULL;
UPDATE document_sales_invoice d SET currency = COALESCE(t.currency, 'USD')
  FROM tenant t WHERE t.id = d.tenant_id AND d.currency IS NULL;
UPDATE document_sales_invoice SET currency = 'USD' WHERE currency IS NULL;
UPDATE document_purchases_payment_sent d SET currency = COALESCE(t.currency, 'USD')
  FROM tenant t WHERE t.id = d.tenant_id AND d.currency IS NULL;
UPDATE document_purchases_payment_sent SET currency = 'USD' WHERE currency IS NULL;
UPDATE document_sales_payment_received d SET currency = COALESCE(t.currency, 'USD')
  FROM tenant t WHERE t.id = d.tenant_id AND d.currency IS NULL;
UPDATE document_sales_payment_received SET currency = 'USD' WHERE currency IS NULL;

ALTER TABLE document_purchases_invoice        ALTER COLUMN currency SET NOT NULL;
ALTER TABLE document_sales_invoice            ALTER COLUMN currency SET NOT NULL;
ALTER TABLE document_purchases_payment_sent   ALTER COLUMN currency SET NOT NULL;
ALTER TABLE document_sales_payment_received   ALTER COLUMN currency SET NOT NULL;

-- (3) amount_original + currency_original on A/P and A/R movements.
ALTER TABLE movement_purchases_accounts_payable
  ADD COLUMN IF NOT EXISTS amount_original DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS currency_original VARCHAR(3);
ALTER TABLE movement_sales_accounts_receivable
  ADD COLUMN IF NOT EXISTS amount_original DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS currency_original VARCHAR(3);

UPDATE movement_purchases_accounts_payable m
SET amount_original = m.amount, currency_original = COALESCE(t.currency, 'USD')
FROM tenant t WHERE t.id = m.tenant_id AND m.amount_original IS NULL;
UPDATE movement_purchases_accounts_payable
SET amount_original = amount, currency_original = 'USD'
WHERE amount_original IS NULL;

UPDATE movement_sales_accounts_receivable m
SET amount_original = m.amount, currency_original = COALESCE(t.currency, 'USD')
FROM tenant t WHERE t.id = m.tenant_id AND m.amount_original IS NULL;
UPDATE movement_sales_accounts_receivable
SET amount_original = amount, currency_original = 'USD'
WHERE amount_original IS NULL;

-- Leave amount_original + currency_original nullable for now. Posting fns that
-- emit money in the tenant base currency can skip them; posting fns that
-- handle multi-currency must always include both. New rows from docs that
-- specify `currency` get populated at post time by the updated posting fns.
