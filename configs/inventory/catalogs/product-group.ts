import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'inventory',
  name: 'product_group',
  label: { en: 'Product Group', ru: 'Группа товаров', tr: 'Ürün Grubu' },
  pluralLabel: {
    en: 'Product Groups',
    ru: 'Группы товаров',
    tr: 'Ürün Grupları',
  },
  icon: 'Boxes',
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
