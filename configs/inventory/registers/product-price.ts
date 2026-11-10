import { defineInformationRegister, field } from '@/platform/metadata';

defineInformationRegister({
  module: 'inventory',
  name: 'product_price',
  label: { en: 'Product Prices', ru: 'Цены номенклатуры', tr: 'Ürün Fiyatları' },
  pluralLabel: { en: 'Product Prices', ru: 'Цены номенклатуры', tr: 'Ürün Fiyatları' },
  icon: 'Tag',
  periodicity: 'date',
  dimensions: {
    product: field.reference({
      label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'product' },
    }),
    priceType: field.reference({
      label: { en: 'Price Type', ru: 'Тип цен', tr: 'Fiyat Türü' },
      required: true,
      to: { kind: 'ref', module: 'sales', name: 'price_type' },
    }),
  },
  resources: {
    price: field.money({
      label: { en: 'Price', ru: 'Цена', tr: 'Fiyat' },
      required: true,
    }),
  },
  recorder: { module: 'inventory', name: 'price_setting' },
  permissions: { read: 'any' },
  listColumnOrder: ['period', 'product', 'priceType', 'price'],
});
