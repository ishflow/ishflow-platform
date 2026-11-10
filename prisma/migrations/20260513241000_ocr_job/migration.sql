-- CreateEnum
CREATE TYPE "ocr_job_status" AS ENUM ('pending', 'running', 'done', 'failed');

-- CreateTable: PurchaseInvoiceOcrJob (AI invoice OCR extraction job)
CREATE TABLE "purchase_invoice_ocr_job" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "status" "ocr_job_status" NOT NULL DEFAULT 'pending',
    "output" JSONB,
    "error_message" TEXT,
    "model_name" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_invoice_ocr_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_invoice_ocr_job_tenant_id_created_at_idx" ON "purchase_invoice_ocr_job"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "purchase_invoice_ocr_job"
  ADD CONSTRAINT "purchase_invoice_ocr_job_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_invoice_ocr_job"
  ADD CONSTRAINT "purchase_invoice_ocr_job_attachment_id_fkey"
  FOREIGN KEY ("attachment_id") REFERENCES "attachment"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

-- RLS: purchase_invoice_ocr_job
ALTER TABLE purchase_invoice_ocr_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_ocr_job FORCE ROW LEVEL SECURITY;

CREATE POLICY purchase_invoice_ocr_job_tenant_isolation ON purchase_invoice_ocr_job
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY purchase_invoice_ocr_job_superuser_bypass ON purchase_invoice_ocr_job
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
