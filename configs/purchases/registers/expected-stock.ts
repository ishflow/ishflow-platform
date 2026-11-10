import { defineAccumulationRegister, field } from '@/platform/metadata';

/**
 * `purchases.expected_stock` — ожидаемые поступления / pending supplier deliveries
 * accumulation register.
 *
 * Written by:
 *   1. `purchases.purchase_order` at posting time — `kind: 'in'` rows that
 *      record how much of each product is on order from each supplier and
 *      expected to land in a specific warehouse.
 *   2. `purchases.purchase_invoice` at posting time — `kind: 'out'` rows
 *      that close the expectation once the goods physically arrive on the
 *      matching purchase order.
 *   3. Any cancellation / unposting of the above documents inverts the
 *      original movement via the standard register reversal flow.
 *
 * Balance per (warehouse, product, supplier) tells purchasing + warehouse
 * staff how much incoming stock to plan for. Pairs with on-hand
 * `stock_balance` to drive replenishment + lead-time dashboards.
 */
defineAccumulationRegister({
  module: 'purchases',
  name: 'expected_stock',
  label: {
    en: 'Expected Stock',
    ru: 'Ожидаемые товары',
    tr: 'Beklenen Stok',
  },
  icon: 'PackagePlus',
  dimensions: {
    warehouse: field.reference({
      label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    product: field.reference({
      label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'product' },
    }),
    supplier: field.reference({
      label: { en: 'Supplier', ru: 'Поставщик', tr: 'Tedarikçi' },
      required: true,
      to: { kind: 'ref', module: 'purchases', name: 'supplier' },
    }),
  },
  resources: {
    quantity: field.number({
      label: { en: 'Quantity', ru: 'Количество', tr: 'Miktar' },
      required: true,
    }),
  },
  listColumnOrder: ['warehouse', 'product', 'supplier', 'quantity', 'kind', 'timestamp', 'docRef'],
});
