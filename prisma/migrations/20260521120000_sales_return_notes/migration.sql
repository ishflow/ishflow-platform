-- prisma/migrations/20260521120000_sales_return_notes/migration.sql
ALTER TABLE document_sales_return_invoice
  ADD COLUMN notes TEXT NULL;
