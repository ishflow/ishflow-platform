-- CreateTable
CREATE TABLE "catalog_purchases_supplier" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catalog_purchases_supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_purchases_invoice" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "posted_at" TIMESTAMP(3),
    "posted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_purchases_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_line_purchases_invoice_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "product" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_line_purchases_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_purchases_accounts_payable" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "doc_ref" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "supplier" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_purchases_accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_purchases_supplier_tenant_id_idx" ON "catalog_purchases_supplier"("tenant_id");

-- CreateIndex
CREATE INDEX "catalog_purchases_supplier_tenant_id_deleted_at_idx" ON "catalog_purchases_supplier"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "catalog_purchases_supplier_tenant_id_created_at_idx" ON "catalog_purchases_supplier"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "catalog_purchases_supplier_tenant_id_name_idx" ON "catalog_purchases_supplier"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_purchases_supplier_tenant_id_name_key" ON "catalog_purchases_supplier"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "document_purchases_invoice_tenant_id_idx" ON "document_purchases_invoice"("tenant_id");

-- CreateIndex
CREATE INDEX "document_purchases_invoice_tenant_id_deleted_at_idx" ON "document_purchases_invoice"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "document_purchases_invoice_tenant_id_status_idx" ON "document_purchases_invoice"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "document_purchases_invoice_tenant_id_posted_at_idx" ON "document_purchases_invoice"("tenant_id", "posted_at");

-- CreateIndex
CREATE INDEX "document_purchases_invoice_tenant_id_created_at_idx" ON "document_purchases_invoice"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_purchases_invoice_tenant_id_number_key" ON "document_purchases_invoice"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "document_line_purchases_invoice_items_tenant_id_idx" ON "document_line_purchases_invoice_items"("tenant_id");

-- CreateIndex
CREATE INDEX "document_line_purchases_invoice_items_tenant_id_document_id_idx" ON "document_line_purchases_invoice_items"("tenant_id", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_line_purchases_invoice_items_tenant_id_document_id_key" ON "document_line_purchases_invoice_items"("tenant_id", "document_id", "sequence");

-- CreateIndex
CREATE INDEX "movement_purchases_accounts_payable_tenant_id_idx" ON "movement_purchases_accounts_payable"("tenant_id");

-- CreateIndex
CREATE INDEX "movement_purchases_accounts_payable_tenant_id_active_idx" ON "movement_purchases_accounts_payable"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "movement_purchases_accounts_payable_tenant_id_doc_ref_idx" ON "movement_purchases_accounts_payable"("tenant_id", "doc_ref");

-- CreateIndex
CREATE INDEX "movement_purchases_accounts_payable_tenant_id_supplier_time_idx" ON "movement_purchases_accounts_payable"("tenant_id", "supplier", "timestamp");

