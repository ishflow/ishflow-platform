ALTER TABLE document_sales_payment_received ADD COLUMN "linkedInvoices" text;
ALTER TABLE document_purchases_payment_sent ADD COLUMN "linkedInvoices" text;
ALTER TABLE movement_sales_accounts_receivable ADD COLUMN "relatedDocRef" uuid;
ALTER TABLE movement_purchases_accounts_payable ADD COLUMN "relatedDocRef" uuid;
DROP INDEX IF EXISTS movement_sales_accounts_receivable_tenant_id_customer_times_idx;
CREATE INDEX "movement_sales_accounts_receivable_tenant_id_customer_relateddocref_timestamp_idx" ON movement_sales_accounts_receivable (tenant_id, customer, "relatedDocRef", timestamp);
DROP INDEX IF EXISTS movement_purchases_accounts_payable_tenant_id_supplier_time_idx;
CREATE INDEX "movement_purchases_accounts_payable_tenant_id_supplier_relateddocref_timestamp_idx" ON movement_purchases_accounts_payable (tenant_id, supplier, "relatedDocRef", timestamp);
