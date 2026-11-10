-- AlterTable
ALTER TABLE "catalog_sales_customer" ADD COLUMN     "assignedRepId" TEXT;

-- AlterTable
ALTER TABLE "document_sales_invoice" ADD COLUMN     "assignedRepId" TEXT;

-- AlterTable
ALTER TABLE "document_sales_payment_received" ADD COLUMN     "assignedRepId" TEXT;

-- CreateIndex
CREATE INDEX "catalog_sales_customer_tenant_id_assignedRepId_idx" ON "catalog_sales_customer"("tenant_id", "assignedRepId");

-- CreateIndex
CREATE INDEX "document_sales_invoice_tenant_id_assignedRepId_idx" ON "document_sales_invoice"("tenant_id", "assignedRepId");

-- CreateIndex
CREATE INDEX "document_sales_payment_received_tenant_id_assignedRepId_idx" ON "document_sales_payment_received"("tenant_id", "assignedRepId");
