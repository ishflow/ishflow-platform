-- Drop unused payment_terms column from purchase-return.
-- Returns don't carry payment-term semantics — the original invoice does.
ALTER TABLE document_purchases_return_purchase
  DROP COLUMN IF EXISTS payment_terms;
