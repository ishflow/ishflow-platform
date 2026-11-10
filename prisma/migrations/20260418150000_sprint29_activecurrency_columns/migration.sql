-- Sprint 29 Task 7: tighten document currency columns to VARCHAR(3) via field.activeCurrency
-- Additive only — no drops, no renames. Narrows TEXT -> VARCHAR(3) on existing currency columns.

ALTER TABLE "document_purchases_invoice"       ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
ALTER TABLE "document_purchases_payment_sent"  ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
ALTER TABLE "document_sales_invoice"           ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
ALTER TABLE "document_sales_payment_received"  ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
