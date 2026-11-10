import { defineAccumulationRegister, field } from '@/platform/metadata';

defineAccumulationRegister({
  module: 'inventory',
  name: 'stock_balance',
  label: { en: 'Stock Balance', ru: 'Остатки склада', tr: 'Stok Bakiyesi' },
  icon: 'Boxes',
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
  },
  resources: {
    quantity: field.number({
      label: { en: 'Quantity', ru: 'Количество', tr: 'Miktar' },
      required: true,
    }),
    totalCost: field.money({
      label: { en: 'Total Cost', ru: 'Сумма себестоимости', tr: 'Toplam Maliyet' },
      required: true,
    }),
  },
  listColumnOrder: ['product', 'warehouse', 'quantity', 'kind', 'totalCost', 'timestamp', 'docRef'],
});
