import { defineAccumulationRegister, field } from '@/platform/metadata';

defineAccumulationRegister({
  module: 'purchases',
  name: 'accounts_payable',
  label: {
    en: 'Accounts Payable',
    ru: 'Кредиторская задолженность',
    tr: 'Borçlar Hesabı',
  },
  icon: 'HandCoins',
  dimensions: {
    supplier: field.reference({
      label: { en: 'Supplier', ru: 'Поставщик', tr: 'Tedarikçi' },
      required: true,
      to: { kind: 'ref', module: 'purchases', name: 'supplier' },
    }),
    relatedDocRef: field.string({
      label: { en: 'Related Document', ru: 'Связанный документ', tr: 'İlgili Belge' },
    }),
  },
  resources: {
    amount: field.money({
      label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
      required: true,
    }),
  },
  listColumnOrder: ['supplier', 'amount', 'kind', 'timestamp', 'docRef'],
});
