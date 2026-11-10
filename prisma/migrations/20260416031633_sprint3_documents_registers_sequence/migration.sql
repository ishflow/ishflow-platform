-- CreateTable
CREATE TABLE "document_sequence" (
    "tenant_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "document_sequence_pkey" PRIMARY KEY ("tenant_id","doc_type")
);

-- CreateTable
CREATE TABLE "catalog_inventory_product" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catalog_inventory_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sales_invoice" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "posted_at" TIMESTAMP(3),
    "posted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "customer" UUID NOT NULL,
    "product" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_sales_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_inventory_stock_balance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "doc_ref" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "product" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_inventory_stock_balance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_inventory_product_code_key" ON "catalog_inventory_product"("code");

-- CreateIndex
CREATE INDEX "catalog_inventory_product_tenant_id_idx" ON "catalog_inventory_product"("tenant_id");

-- CreateIndex
CREATE INDEX "catalog_inventory_product_tenant_id_deleted_at_idx" ON "catalog_inventory_product"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "catalog_inventory_product_tenant_id_created_at_idx" ON "catalog_inventory_product"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "catalog_inventory_product_tenant_id_name_idx" ON "catalog_inventory_product"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "document_sales_invoice_tenant_id_idx" ON "document_sales_invoice"("tenant_id");

-- CreateIndex
CREATE INDEX "document_sales_invoice_tenant_id_deleted_at_idx" ON "document_sales_invoice"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "document_sales_invoice_tenant_id_status_idx" ON "document_sales_invoice"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "document_sales_invoice_tenant_id_posted_at_idx" ON "document_sales_invoice"("tenant_id", "posted_at");

-- CreateIndex
CREATE INDEX "document_sales_invoice_tenant_id_created_at_idx" ON "document_sales_invoice"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_sales_invoice_tenant_id_number_key" ON "document_sales_invoice"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "movement_inventory_stock_balance_tenant_id_idx" ON "movement_inventory_stock_balance"("tenant_id");

-- CreateIndex
CREATE INDEX "movement_inventory_stock_balance_tenant_id_active_idx" ON "movement_inventory_stock_balance"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "movement_inventory_stock_balance_tenant_id_doc_ref_idx" ON "movement_inventory_stock_balance"("tenant_id", "doc_ref");

-- CreateIndex
CREATE INDEX "movement_inventory_stock_balance_tenant_id_product_timestam_idx" ON "movement_inventory_stock_balance"("tenant_id", "product", "timestamp");
