-- Remove multi-currency / FX: drop FX tables, currency columns, and the
-- multi-currency-aware cash-funds index. Single operational currency remains on
-- tenant.currency (and addon bank_account/bank_statement_row currency).

DROP INDEX "movement_treasury_cash_funds_tenant_kasa_ccy_idx";

ALTER TABLE "catalog_assets_fixed_asset" DROP COLUMN "currency";

ALTER TABLE "catalog_treasury_cash_register" DROP COLUMN "currency";

ALTER TABLE "document_assets_disposal" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_assets_receipt" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_line_treasury_debt_adjustment_items" DROP COLUMN "amount_original",
  ADD COLUMN "amount" DECIMAL(14,2) NOT NULL;

ALTER TABLE "document_purchases_bank_payment" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_purchases_invoice" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_purchases_order" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_purchases_payment_request" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_purchases_payment_sent" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_purchases_refund_received" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_purchases_return_purchase" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_purchases_service_receipt" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_bank_receipt" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_commercial_offer" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_invoice" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_invoice_for_payment" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_order" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_payment_received" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_refund_payment" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_retail_sale" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_return_invoice" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_sales_service_sale" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_treasury_bank_deposit" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_treasury_bank_transfer" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_treasury_bank_withdrawal" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_treasury_cash_transfer" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_treasury_debt_adjustment" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_treasury_expense_report" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "document_treasury_payment_order" DROP COLUMN "currency",
  DROP COLUMN "fx_rate";

ALTER TABLE "movement_inventory_stock_balance" DROP COLUMN "currency_original",
  DROP COLUMN "fx_rate",
  DROP COLUMN "total_cost_original";

ALTER TABLE "movement_purchases_accounts_payable" DROP COLUMN "amount_original",
  DROP COLUMN "currency_original",
  DROP COLUMN "fx_rate";

ALTER TABLE "movement_sales_accounts_receivable" DROP COLUMN "amount_original",
  DROP COLUMN "currency_original",
  DROP COLUMN "fx_rate";

ALTER TABLE "movement_sales_sale" DROP COLUMN "cost_original",
  DROP COLUMN "currency_original",
  DROP COLUMN "fx_rate",
  DROP COLUMN "revenue_original";

ALTER TABLE "movement_treasury_cash_funds" DROP COLUMN "amount_original",
  DROP COLUMN "currency_original",
  DROP COLUMN "fx_rate";

ALTER TABLE "register_inventory_product_price" DROP COLUMN "currency";

ALTER TABLE "tenant" DROP COLUMN "fx_sources";

DROP TABLE "catalog_platform_currency" CASCADE;

DROP TABLE "fx_rate" CASCADE;

DROP TABLE "movement_treasury_fx_pl" CASCADE;
