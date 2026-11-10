import { defineDocument, field } from '@/platform/metadata';
// Side-effect import: cash_transfer posts to treasury.cash_funds, so any
// test/runtime path that imports this doc must also register that register.
import '@/configs/treasury/registers/cash-funds';

/**
 * `treasury.cash_transfer` — Перемещение наличных / Cash Transfer.
 *
 * Moves cash from one cash register (`fromCashReg`) to another
 * (`toCashReg`). Single-document — no lines; the header carries a single
 * amount. Posting writes a paired expense+income to `treasury.cash_funds`,
 * keyed by each register.
 */
defineDocument({
  module: 'treasury',
  name: 'cash_transfer',
  label: { en: 'Cash Transfer', ru: 'Перемещение наличных', tr: 'Kasa Transferi' },
  pluralLabel: {
    en: 'Cash Transfers',
    ru: 'Перемещения наличных',
    tr: 'Kasa Transferleri',
  },
  icon: 'ArrowLeftRight',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    fromCashReg: field.reference({
      label: { en: 'From Cash Register', ru: 'Касса (из)', tr: 'Kaynak Kasa' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
    }),
    toCashReg: field.reference({
      label: { en: 'To Cash Register', ru: 'Касса (в)', tr: 'Hedef Kasa' },
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
  validators: {
    prePost: [
      async (doc) => {
        if (doc.fromCashReg && doc.toCashReg && doc.fromCashReg === doc.toCashReg) {
          return { ok: false, message: 'CASH_REGISTER_SAME' };
        }
        return { ok: true };
      },
    ],
  },
  posting: {
    'treasury.cash_funds': async (doc) => {
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const fromCashReg = doc.fromCashReg as string | undefined;
      const toCashReg = doc.toCashReg as string | undefined;
      if (!fromCashReg || !toCashReg) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'expense' as const,
          timestamp: date,
          cashRegister: fromCashReg,
          amount,
        },
        {
          kind: 'income' as const,
          timestamp: date,
          cashRegister: toCashReg,
          amount,
        },
      ];
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'fromCashReg',
});
