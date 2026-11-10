-- CreateTable
CREATE TABLE "tenant_deletion_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_slug" TEXT NOT NULL,
    "tenant_name" TEXT NOT NULL,
    "deleted_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "tenant_deletion_log_pkey" PRIMARY KEY ("id")
);
