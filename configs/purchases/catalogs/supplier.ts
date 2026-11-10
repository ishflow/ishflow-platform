import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'purchases',
  name: 'supplier',
  label: { en: 'Supplier', ru: 'Поставщик', tr: 'Tedarikçi' },
  pluralLabel: { en: 'Suppliers', ru: 'Поставщики', tr: 'Tedarikçiler' },
  icon: 'Users',
  fields: {
    code: field.string({
      label: { en: 'Code', ru: 'Код', tr: 'Kod' },
      required: true,
      unique: true,
      maxLength: 32,
      formHidden: true,
      autoGenerate: 'sequence',
    }),
    name: field.string({
      label: { en: 'Name', ru: 'Наименование', tr: 'Ad' },
      required: true,
      unique: true,
    }),
    email: field.string({ label: { en: 'Email', ru: 'Email', tr: 'E-posta' }, email: true }),
    phone: field.string({ label: { en: 'Phone', ru: 'Телефон', tr: 'Telefon' } }),
    notes: field.text({ label: { en: 'Notes', ru: 'Примечания', tr: 'Notlar' } }),
    externalId: field.string({
      label: { en: 'External ID', ru: 'Внешний код', tr: 'Harici ID' },
      maxLength: 64,
      formHidden: true,
      listHidden: true,
    }),
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закреплённый закупщик', tr: 'Atanan Alıcı' },
      formHidden: true,
    }),
  },
  permissions: {
    read: 'any',
  },
  displayField: 'name',
});
