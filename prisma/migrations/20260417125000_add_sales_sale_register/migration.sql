-- CreateTable
CREATE TABLE "movement_sales_sale" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "doc_ref" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "counterparty" UUID NOT NULL,
    "product" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost" DECIMAL(14,2) NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_sales_sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movement_sales_sale_tenant_id_idx" ON "movement_sales_sale"("tenant_id");

-- CreateIndex
CREATE INDEX "movement_sales_sale_tenant_id_active_idx" ON "movement_sales_sale"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "movement_sales_sale_tenant_id_doc_ref_idx" ON "movement_sales_sale"("tenant_id", "doc_ref");

-- CreateIndex
CREATE INDEX "movement_sales_sale_tenant_id_counterparty_product_timestamp_idx" ON "movement_sales_sale"("tenant_id", "counterparty", "product", "timestamp");
