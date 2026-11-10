import { defineDocument, field } from '@/platform/metadata';
// Side-effect import: bank_transfer posts to treasury.bank_funds.
import '@/configs/treasury/registers/bank-funds';

/**
 * `treasury.bank_transfer` — Перевод между счетами / Bank Transfer.
 *
 * Moves funds from one bank account (`fromBank`) to another (`toBank`).
 * Single-document — no lines; the header carries a single amount.
 * Posting writes a paired expense+income to `treasury.bank_funds`,
 * keyed by each bank account.
 */
defineDocument({
  module: 'treasury',
  name: 'bank_transfer',
  label: { en: 'Bank Transfer', ru: 'Перевод между счетами', tr: 'Bankalar Arası Transfer' },
  pluralLabel: {
    en: 'Bank Transfers',
    ru: 'Переводы между счетами',
    tr: 'Banka Transferleri',
  },
  icon: 'ArrowLeftRight',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    fromBank: field.reference({
      label: { en: 'From Bank Account', ru: 'Счёт (из)', tr: 'Kaynak Hesap' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'bank_account' },
    }),
    toBank: field.reference({
      label: { en: 'To Bank Account', ru: 'Счёт (в)', tr: 'Hedef Hesap' },
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
  validators: {
    prePost: [
      async (doc) => {
        if (doc.fromBank && doc.toBank && doc.fromBank === doc.toBank) {
          return { ok: false, message: 'BANK_ACCOUNT_SAME' };
        }
        return { ok: true };
      },
    ],
  },
  posting: {
    'treasury.bank_funds': async (doc) => {
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const fromBank = doc.fromBank as string | undefined;
      const toBank = doc.toBank as string | undefined;
      if (!fromBank || !toBank) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'expense' as const,
          timestamp: date,
          bankAccount: fromBank,
          amount,
        },
        {
          kind: 'income' as const,
          timestamp: date,
          bankAccount: toBank,
          amount,
        },
      ];
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'fromBank',
});
