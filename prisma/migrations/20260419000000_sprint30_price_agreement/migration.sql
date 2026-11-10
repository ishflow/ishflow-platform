-- CreateTable
CREATE TABLE "catalog_sales_price_agreement" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "counterparty" UUID,
    "product" UUID,
    "markupPct" INTEGER,
    "fixedPrice" DECIMAL(14,2),
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catalog_sales_price_agreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_sales_price_agreement_tenant_id_idx" ON "catalog_sales_price_agreement"("tenant_id");

-- CreateIndex
CREATE INDEX "catalog_sales_price_agreement_tenant_id_deleted_at_idx" ON "catalog_sales_price_agreement"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "catalog_sales_price_agreement_tenant_id_created_at_idx" ON "catalog_sales_price_agreement"("tenant_id", "created_at");
