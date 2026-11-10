import { defineAccumulationRegister, field } from '@/platform/metadata';

/**
 * VAT settlement register — tracks tax collected (output) and tax paid (input)
 * so the platform can report the net VAT owed to the tax authority.
 *
 * `kind` convention (matches the engine's income/expense balance model):
 *   - `income`  = OUTPUT VAT — collected on sales (a liability we owe the state)
 *   - `expense` = INPUT VAT  — paid on purchases (reclaimable / reduces net owed)
 * Net VAT payable for a period = Σ income − Σ expense.
 *
 * `counterparty` is a plain string id (customer OR supplier) because VAT spans
 * both modules — a single typed reference wouldn't fit. Only written when the
 * `admin.tax` `taxEnabled` setting is on (see
 * the internal design spec).
 */
defineAccumulationRegister({
  module: 'finance',
  name: 'vat',
  label: {
    en: 'VAT',
    ru: 'НДС',
    tr: 'KDV',
  },
  icon: 'Receipt',
  dimensions: {
    counterparty: field.string({
      label: { en: 'Counterparty', ru: 'Контрагент', tr: 'Cari' },
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
  listColumnOrder: ['counterparty', 'amount', 'kind', 'timestamp', 'docRef'],
});
