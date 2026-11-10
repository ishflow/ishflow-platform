import { defineRegisterOrder } from '@/platform/metadata';

// Hub card order — Kayıtlar layer (money + ledger + stock).
defineRegisterOrder([
  'accounts-receivable',
  'accounts-payable',
  'cash-funds',
  'sales',
  'product-prices',
  'stock-balance',
]);
