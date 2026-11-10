-- Sales invoice notes field — additive, RLS unaffected (tenant policy already covers the table).
ALTER TABLE "document_sales_invoice"
ADD COLUMN "notes" TEXT;
