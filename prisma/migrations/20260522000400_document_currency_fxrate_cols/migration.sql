-- Document header now carries currency + fxRate for all money documents.
-- Stream 2 added these to the DSL header; engine writes them via document-crud
-- which expects matching columns. All nullable so existing rows are valid.

ALTER TABLE "document_sales_invoice"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(18, 8);

ALTER TABLE "document_sales_payment_received"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(18, 8);

ALTER TABLE "document_sales_return_invoice"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(18, 8);

ALTER TABLE "document_purchases_invoice"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(18, 8);

ALTER TABLE "document_purchases_return_purchase"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(18, 8);

ALTER TABLE "document_purchases_payment_sent"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(18, 8);
