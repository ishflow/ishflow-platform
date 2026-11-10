-- Purchase invoice extra fields — additive, RLS unaffected (tenant policy already covers the table).
-- - notes: free-form Açıklama (mirrors sales invoice notes pattern)
-- - supplier_doc_no: supplier's own invoice number for cross-reference
-- - payment_terms: closed-enum string ('cash' | '30d' | '45d' | '60d'); zod schema validates
ALTER TABLE "document_purchases_invoice"
ADD COLUMN "notes" TEXT,
ADD COLUMN "supplier_doc_no" TEXT,
ADD COLUMN "payment_terms" TEXT;
