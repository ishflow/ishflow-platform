-- CreateTable
CREATE TABLE "document_sales_payment_received" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "posted_at" TIMESTAMP(3),
    "posted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "customer" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_sales_payment_received_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_sales_accounts_receivable" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "doc_ref" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "customer" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_sales_accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_sales_payment_received_tenant_id_idx" ON "document_sales_payment_received"("tenant_id");

-- CreateIndex
CREATE INDEX "document_sales_payment_received_tenant_id_deleted_at_idx" ON "document_sales_payment_received"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "document_sales_payment_received_tenant_id_status_idx" ON "document_sales_payment_received"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "document_sales_payment_received_tenant_id_posted_at_idx" ON "document_sales_payment_received"("tenant_id", "posted_at");

-- CreateIndex
CREATE INDEX "document_sales_payment_received_tenant_id_created_at_idx" ON "document_sales_payment_received"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_sales_payment_received_tenant_id_number_key" ON "document_sales_payment_received"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "movement_sales_accounts_receivable_tenant_id_idx" ON "movement_sales_accounts_receivable"("tenant_id");

-- CreateIndex
CREATE INDEX "movement_sales_accounts_receivable_tenant_id_active_idx" ON "movement_sales_accounts_receivable"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "movement_sales_accounts_receivable_tenant_id_doc_ref_idx" ON "movement_sales_accounts_receivable"("tenant_id", "doc_ref");

-- CreateIndex
CREATE INDEX "movement_sales_accounts_receivable_tenant_id_customer_times_idx" ON "movement_sales_accounts_receivable"("tenant_id", "customer", "timestamp");
