-- CreateTable
CREATE TABLE "catalog_sales_customer" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catalog_sales_customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_sales_customer_name_key" ON "catalog_sales_customer"("name");

-- CreateIndex
CREATE INDEX "catalog_sales_customer_tenant_id_idx" ON "catalog_sales_customer"("tenant_id");
