import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'sales',
  name: 'customer',
  label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' },
  pluralLabel: { en: 'Customers', ru: 'Клиенты', tr: 'Müşteriler' },
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
    defaultPriceType: field.reference({
      label: { en: 'Default Price Type', ru: 'Тип цен по умолчанию', tr: 'Varsayılan Fiyat Türü' },
      to: { kind: 'ref', module: 'sales', name: 'price_type' },
    }),
    assignedRepId: field.string({
      label: { en: 'Assigned Rep', ru: 'Закреплённый менеджер', tr: 'Atanan Temsilci' },
      // stores Clerk user id (UUID string)
    }),
    externalId: field.string({
      label: { en: 'External ID', ru: 'Внешний код', tr: 'Harici ID' },
      maxLength: 64,
      formHidden: true,
      listHidden: true,
    }),
  },
  permissions: {
    read: 'any',
  },
  displayField: 'name',
});
