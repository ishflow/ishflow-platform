-- Phase 2 RLS: tenant isolation + bypass on all 8 new tables.
-- Mirrors the policy shape used by other RLS-enabled tables.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_sales_order',
    'document_line_sales_order_items',
    'document_sales_invoice_for_payment',
    'document_line_sales_invoice_for_payment_items',
    'document_purchases_order',
    'document_line_purchases_order_items',
    'document_treasury_debt_adjustment',
    'document_line_treasury_debt_adjustment_items',
    'movement_sales_reserved_stock',
    'movement_purchases_expected_stock'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation" ON %I FOR ALL TO canalog_app '
      'USING ("tenant_id" = current_setting(''app.tenant_id'', true)::uuid) '
      'WITH CHECK ("tenant_id" = current_setting(''app.tenant_id'', true)::uuid)',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "bypass_full" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "bypass_full" ON %I FOR ALL TO canalog '
      'USING (true) WITH CHECK (true)',
      t
    );

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO canalog_app', t);
  END LOOP;
END $$;
