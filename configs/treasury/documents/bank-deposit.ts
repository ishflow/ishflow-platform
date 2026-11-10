import { defineDocument, field } from '@/platform/metadata';
// Side-effect import: bank_deposit posts to treasury.cash_funds (expense
// from the source kasa). The bank side of the transfer has no register
// today — bank balances are tracked via documents only — so this doc
// emits a single-leg cash_funds movement.
import '@/configs/treasury/registers/cash-funds';

/**
 * `treasury.bank_deposit` — Внесение наличных в банк / Bank Deposit.
 *
 * Cash leaves a `cashRegister` and lands in a `bankAccount`. Single-doc,
 * no lines, single user-entered amount. Posting writes one `expense`
 * movement to `treasury.cash_funds`; the bank-side mirror is implicit on
 * the document itself until a bank register exists.
 *
 * NOTE: `treasury.bank_account` is not currently registered as a
 * `defineCatalog` config (the table lives in Prisma only), so the
 * `bankAccount` header field is a plain string holding the id. Swap to
 * `field.reference({ to: { kind: 'ref', module: 'treasury', name: 'bank_account' } })`
 * once a catalog config exists.
 */
defineDocument({
  module: 'treasury',
  name: 'bank_deposit',
  label: { en: 'Bank Deposit', ru: 'Внесение наличных', tr: 'Bankaya Yatırma' },
  pluralLabel: {
    en: 'Bank Deposits',
    ru: 'Внесения наличных',
    tr: 'Bankaya Yatırmalar',
  },
  icon: 'Banknote',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    cashRegister: field.reference({
      label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
    }),
    bankAccount: field.reference({
      label: { en: 'Bank Account', ru: 'Банковский счёт', tr: 'Banka Hesabı' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'bank_account' },
    }),
    amount: field.money({
      label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
      required: true,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {},
  posting: {
    'treasury.cash_funds': async (doc) => {
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const cashRegister = doc.cashRegister as string | undefined;
      if (!cashRegister) return [];
      return [
        {
          kind: 'expense' as const,
          timestamp: (doc.date as Date) ?? new Date(),
          cashRegister,
          amount,
        },
      ];
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'cashRegister',
});
