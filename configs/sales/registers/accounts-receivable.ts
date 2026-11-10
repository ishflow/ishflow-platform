import { defineAccumulationRegister, field } from '@/platform/metadata';

defineAccumulationRegister({
  module: 'sales',
  name: 'accounts_receivable',
  label: {
    en: 'Accounts Receivable',
    ru: 'Дебиторская задолженность',
    tr: 'Alacak Hesapları',
  },
  icon: 'Landmark',
  dimensions: {
    customer: field.reference({
      label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' },
      required: true,
      to: { kind: 'ref', module: 'sales', name: 'customer' },
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
  listColumnOrder: ['customer', 'amount', 'kind', 'timestamp', 'docRef'],
});
