-- CreateTable
CREATE TABLE "document_purchases_payment_sent" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "posted_at" TIMESTAMP(3),
    "posted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_purchases_payment_sent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_purchases_payment_sent_tenant_id_idx" ON "document_purchases_payment_sent"("tenant_id");

-- CreateIndex
CREATE INDEX "document_purchases_payment_sent_tenant_id_deleted_at_idx" ON "document_purchases_payment_sent"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "document_purchases_payment_sent_tenant_id_status_idx" ON "document_purchases_payment_sent"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "document_purchases_payment_sent_tenant_id_posted_at_idx" ON "document_purchases_payment_sent"("tenant_id", "posted_at");

-- CreateIndex
CREATE INDEX "document_purchases_payment_sent_tenant_id_created_at_idx" ON "document_purchases_payment_sent"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_purchases_payment_sent_tenant_id_number_key" ON "document_purchases_payment_sent"("tenant_id", "number");

