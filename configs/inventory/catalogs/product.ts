import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'inventory',
  name: 'product',
  label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
  pluralLabel: { en: 'Products', ru: 'Номенклатура', tr: 'Ürünler' },
  icon: 'Package',
  fields: {
    code: field.string({
      label: { en: 'Code', ru: 'Код', tr: 'Kod' },
      required: true,
      unique: true,
      maxLength: 32,
      formHidden: true,
      listHidden: true,
      autoGenerate: 'sequence',
    }),
    name: field.string({
      label: { en: 'Name', ru: 'Наименование', tr: 'Ad' },
      required: true,
    }),
    categoryId: field.reference({
      label: { en: 'Category', ru: 'Категория', tr: 'Kategori' },
      to: { kind: 'ref', module: 'inventory', name: 'product_category' },
      inlineCreate: true,
    }),
    groupId: field.reference({
      label: { en: 'Group', ru: 'Группа', tr: 'Grup' },
      to: { kind: 'ref', module: 'inventory', name: 'product_group' },
      inlineCreate: true,
    }),
    barcode: field.string({
      label: { en: 'Barcode', ru: 'Штрихкод', tr: 'Barkod' },
      maxLength: 64,
    }),
    externalId: field.string({
      label: { en: 'External ID', ru: 'Внешний код', tr: 'Harici ID' },
      maxLength: 64,
      formHidden: true,
      listHidden: true,
    }),
    unit: field.string({
      label: { en: 'Unit', ru: 'Единица измерения', tr: 'Birim' },
      maxLength: 16,
    }),
    costPrice: field.money({
      // Hidden on master-data forms — cost is computed from stock movements
      // (income → average cost), not user-entered. Kept in DSL so existing
      // values persist and reports/posting can read them.
      label: { en: 'Cost', ru: 'Себестоимость', tr: 'Maliyet' },
      formHidden: true,
    }),
    listPrice: field.money({
      // 1C-canonical: products do NOT carry a sale price. Sale prices come
      // from sales.price_type (static via price-setting docs, or dynamic
      // markup over avg cost). Kept in DSL for legacy reads + import paths.
      label: { en: 'List price', ru: 'Цена прайса', tr: 'Liste fiyatı' },
      formHidden: true,
      listHidden: true,
    }),
    minStock: field.number({
      label: { en: 'Min stock', ru: 'Запас минимум', tr: 'Stok minimum' },
      min: 0,
    }),
    maxStock: field.number({
      label: { en: 'Max stock', ru: 'Запас максимум', tr: 'Stok maksimum' },
      min: 0,
    }),
    description: field.text({
      label: { en: 'Description', ru: 'Описание', tr: 'Açıklama' },
      listHidden: true,
    }),
  },
  permissions: {
    read: 'any',
  },
  displayField: 'name',
  // Same-named products are legal (distinguished by SKU) but usually a mistake,
  // so warn-and-confirm on create rather than hard-block (QA M5 / design D6).
  warnDuplicateField: 'name',
});
