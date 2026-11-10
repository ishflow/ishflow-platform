import { defineAccumulationRegister, field } from '@/platform/metadata';

defineAccumulationRegister({
  module: 'treasury',
  name: 'cash_funds',
  label: {
    en: 'Cash Funds',
    ru: 'Денежные средства',
    tr: 'Kasa Bakiyesi',
  },
  icon: 'Wallet',
  dimensions: {
    cashRegister: field.reference({
      label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
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
  listColumnOrder: ['cashRegister', 'amount', 'kind', 'timestamp', 'docRef'],
});
