-- Remove currency column from document_purchases_payment_sent
ALTER TABLE "document_purchases_payment_sent" DROP COLUMN IF EXISTS "currency";

-- Remove currency column from document_sales_payment_received
ALTER TABLE "document_sales_payment_received" DROP COLUMN IF EXISTS "currency";
