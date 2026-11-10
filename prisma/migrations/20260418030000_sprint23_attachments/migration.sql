-- CreateTable
CREATE TABLE "attachment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attachment_object_key_key" ON "attachment"("object_key");

-- CreateIndex
CREATE INDEX "attachment_tenant_id_idx" ON "attachment"("tenant_id");

-- CreateIndex
CREATE INDEX "attachment_tenant_id_entity_entity_id_idx" ON "attachment"("tenant_id", "entity", "entity_id");

-- CreateIndex
CREATE INDEX "attachment_tenant_id_deleted_at_idx" ON "attachment"("tenant_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
