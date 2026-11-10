import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'inventory',
  name: 'product_category',
  label: { en: 'Product Category', ru: 'Категория товара', tr: 'Ürün Kategorisi' },
  pluralLabel: {
    en: 'Product Categories',
    ru: 'Категории товаров',
    tr: 'Ürün Kategorileri',
  },
  icon: 'Tag',
  sidebarHidden: true,
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
      unique: true,
    }),
    description: field.text({
      label: { en: 'Description', ru: 'Описание', tr: 'Açıklama' },
    }),
  },
  permissions: { read: 'any' },
  displayField: 'name',
});
