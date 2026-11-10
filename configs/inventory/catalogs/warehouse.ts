import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'inventory',
  name: 'warehouse',
  label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
  pluralLabel: { en: 'Warehouses', ru: 'Склады', tr: 'Depolar' },
  icon: 'Warehouse',
  fields: {
    code: field.string({
      label: { en: 'Code', ru: 'Код', tr: 'Kod' },
      required: true,
      unique: true,
      maxLength: 16,
      formHidden: true,
      listHidden: true,
      autoGenerate: 'sequence',
    }),
    name: field.string({
      label: { en: 'Name', ru: 'Наименование', tr: 'Ad' },
      required: true,
    }),
    address: field.text({
      label: { en: 'Address', ru: 'Адрес', tr: 'Adres' },
    }),
  },
  permissions: { read: 'any' },
  displayField: 'name',
});
