import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'treasury',
  name: 'cash_register',
  label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' },
  pluralLabel: { en: 'Cash Registers', ru: 'Кассы', tr: 'Kasalar' },
  icon: 'Wallet',
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
    openingBalance: field.money({
      label: { en: 'Opening balance', ru: 'Начальный остаток', tr: 'Açılış bakiyesi' },
    }),
    note: field.text({
      label: { en: 'Note', ru: 'Примечание', tr: 'Not' },
    }),
  },
  permissions: { read: 'any' },
  displayField: 'name',
});
