import { defineAccumulationRegister, field } from '@/platform/metadata';
// Side-effect import: the `bankAccount` dimension references
// `treasury.bank_account`, so any runtime/test path that imports this
// register must also have the catalog registered.
import '@/configs/treasury/catalogs/bank-account';

/**
 * `treasury.bank_funds` — Денежные средства на счетах / Bank Funds.
 *
 * Accumulation register tracking the running balance of every bank
 * account. Symmetric to `treasury.cash_funds` (which tracks kasalar).
 * Single resource = `amount`; `kind` discriminates `income` (credit)
 * vs `expense` (debit).
 */
defineAccumulationRegister({
  module: 'treasury',
  name: 'bank_funds',
  label: {
    en: 'Bank Funds',
    ru: 'Денежные средства на счетах',
    tr: 'Banka Bakiyeleri',
  },
  icon: 'Landmark',
  dimensions: {
    bankAccount: field.reference({
      label: { en: 'Bank Account', ru: 'Банковский счёт', tr: 'Banka Hesabı' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'bank_account' },
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
  listColumnOrder: ['bankAccount', 'amount', 'kind', 'timestamp', 'docRef'],
});
