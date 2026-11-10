import { defineReportOrder } from '@/platform/metadata';

// Hub card order — Raporlar layer (margin + statements + turnover + ops + cards).
defineReportOrder([
  'gross-profit',
  'income-statement',
  'cash-flow',
  'cash-book',
  'turnover-receivable',
  'turnover-payable',
  'turnover-sales',
  'turnover-stock',
  'top-customers',
  'counterparty-card',
  'product-card',
  'inventory-valuation',
  'aging',
  'slow-stock',
]);
