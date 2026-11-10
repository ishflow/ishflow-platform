-- 1. Header'a warehouse kolonu ekle (nullable, backfill için)
ALTER TABLE document_purchases_invoice
  ADD COLUMN warehouse UUID;

-- 2. Backfill: her doküman için ilk line'ın deposunu header'a kopyala
UPDATE document_purchases_invoice d
SET warehouse = (
  SELECT l.warehouse
  FROM document_line_purchases_invoice_items l
  WHERE l.document_id = d.id
    AND l.tenant_id = d.tenant_id
  ORDER BY l.sequence ASC
  LIMIT 1
);

-- 3. Hiç line'ı olmayan dokümanlar için fallback: tenant'ın ilk deposu
UPDATE document_purchases_invoice d
SET warehouse = (
  SELECT w.id FROM catalog_inventory_warehouse w
  WHERE w.tenant_id = d.tenant_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE d.warehouse IS NULL;

-- 4. NOT NULL constraint
ALTER TABLE document_purchases_invoice
  ALTER COLUMN warehouse SET NOT NULL;

-- 5. Currency kolonunu sil
ALTER TABLE document_purchases_invoice
  DROP COLUMN currency;

-- 6. Line'dan warehouse kolonunu sil
ALTER TABLE document_line_purchases_invoice_items
  DROP COLUMN warehouse;
