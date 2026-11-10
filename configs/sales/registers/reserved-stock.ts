import { defineAccumulationRegister, field } from '@/platform/metadata';

/**
 * `sales.reserved_stock` — рези́рвы товаров под клиентов / customer stock reservation
 * accumulation register.
 *
 * Written by:
 *   1. `sales.customer_order` at posting time — `kind: 'in'` rows that
 *      earmark warehouse stock for a specific customer until the matching
 *      sales invoice ships.
 *   2. `sales.sales_invoice` at posting time — `kind: 'out'` rows that
 *      release the reservation once the goods are actually sold from the
 *      same warehouse.
 *   3. Any cancellation / unposting of the above documents inverts the
 *      original movement via the standard register reversal flow.
 *
 * Balance per (warehouse, product, customer) tells warehouse + sales staff
 * how much of the on-hand stock is already promised away vs. truly free
 * to sell. The companion read-side query is `stock_balance - reserved_stock`.
 */
defineAccumulationRegister({
  module: 'sales',
  name: 'reserved_stock',
  label: {
    en: 'Reserved Stock',
    ru: 'Зарезервированные товары',
    tr: 'Rezerve Stok',
  },
  icon: 'PackageCheck',
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
    customer: field.reference({
      label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' },
      required: true,
      to: { kind: 'ref', module: 'sales', name: 'customer' },
    }),
  },
  resources: {
    quantity: field.number({
      label: { en: 'Quantity', ru: 'Количество', tr: 'Miktar' },
      required: true,
    }),
  },
  listColumnOrder: ['warehouse', 'product', 'customer', 'quantity', 'kind', 'timestamp', 'docRef'],
});
