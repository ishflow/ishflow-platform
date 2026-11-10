import { defineDocument, field } from '@/platform/metadata';
// Side-effect import: bank_withdrawal posts to treasury.cash_funds (income
// into the destination kasa). The bank side has no register yet — bank
// balances are tracked via documents only.
import '@/configs/treasury/registers/cash-funds';

/**
 * `treasury.bank_withdrawal` — Снятие наличных из банка / Bank Withdrawal.
 *
 * Symmetric mirror of `bank_deposit`: cash leaves a `bankAccount` and
 * lands in a `cashRegister`. Single-doc, no lines. Posting writes one
 * `income` movement to `treasury.cash_funds`; the bank-side mirror is
 * implicit on the document itself until a bank register exists.
 *
 * NOTE: see bank-deposit.ts — `bankAccount` is a plain string until a
 * `defineCatalog` config exists for treasury.bank_account.
 */
defineDocument({
  module: 'treasury',
  name: 'bank_withdrawal',
  label: { en: 'Bank Withdrawal', ru: 'Снятие наличных', tr: 'Bankadan Çekme' },
  pluralLabel: {
    en: 'Bank Withdrawals',
    ru: 'Снятия наличных',
    tr: 'Bankadan Çekmeler',
  },
  icon: 'Banknote',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    bankAccount: field.reference({
      label: { en: 'Bank Account', ru: 'Банковский счёт', tr: 'Banka Hesabı' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'bank_account' },
    }),
    cashRegister: field.reference({
      label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
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
          kind: 'income' as const,
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
