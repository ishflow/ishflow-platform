import { defineAccumulationRegister, field } from '@/platform/metadata';

defineAccumulationRegister({
  module: 'sales',
  name: 'sale',
  label: { en: 'Sales', ru: 'Продажа', tr: 'Satış' },
  icon: 'TrendingUp',
  dimensions: {
    counterparty: field.reference({
      // 1C terminology: A/R uses `customer` for the same ref; both resolve to sales.customer.
      label: { en: 'Counterparty', ru: 'Контрагент', tr: 'Cari' },
      required: true,
      to: { kind: 'ref', module: 'sales', name: 'customer' },
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
    cost: field.money({
      label: { en: 'Cost', ru: 'Себестоимость', tr: 'Maliyet' },
      required: true,
    }),
    revenue: field.money({
      label: { en: 'Revenue', ru: 'Выручка', tr: 'Satış Tutarı' },
      required: true,
    }),
  },
  listColumnOrder: [
    'counterparty',
    'product',
    'quantity',
    'revenue',
    'kind',
    'timestamp',
    'docRef',
    'cost',
  ],
});
