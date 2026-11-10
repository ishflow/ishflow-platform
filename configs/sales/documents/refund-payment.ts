import { defineDocument, field } from '@/platform/metadata';
// Side-effect imports: refund_payment posts to AR + cash_funds, so any
// test/runtime path that imports this doc must have both registers loaded.
import '@/configs/sales/registers/accounts-receivable';
import '@/configs/treasury/registers/cash-funds';

/**
 * `sales.refund_payment` — Возврат покупателю / Refund to Customer.
 *
 * Cash refund issued to a customer (typically following a return-invoice
 * or overpayment). Header-only — no lines; the header carries a single
 * amount and an optional cashRegister.
 *
 * Posting:
 *   - `sales.accounts_receivable`: kind=`expense` with NEGATIVE amount
 *     so the AR balance moves UP (we re-owe the customer the cash we
 *     just refunded). This mirrors but inverts payment-received, where
 *     positive 'expense' decreases AR.
 *   - `treasury.cash_funds`: kind=`expense` with positive base amount
 *     (cash leaves the register).
 */
defineDocument({
  module: 'sales',
  name: 'refund_payment',
  direction: 'out',
  label: { en: 'Refund to Customer', ru: 'Возврат покупателю', tr: 'Müşteri İadesi' },
  pluralLabel: {
    en: 'Refunds to Customers',
    ru: 'Возвраты покупателям',
    tr: 'Müşteri İadeleri',
  },
  icon: 'Undo2',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    customer: field.reference({
      label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' },
      required: true,
      to: { kind: 'ref', module: 'sales', name: 'customer' },
    }),
    cashRegister: field.reference({
      label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' },
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
    }),
    amount: field.money({
      label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
      required: true,
    }),
    reason: field.string({
      label: { en: 'Reason', ru: 'Причина', tr: 'Sebep' },
      maxLength: 256,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {},
  posting: {
    'sales.accounts_receivable': async (doc) => {
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const amountBase = Math.round(amount * 100) / 100;
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          // Inverse of payment-received: 'expense' with negative amount
          // pushes AR UP (the refund re-opens the customer's claim on us).
          kind: 'expense' as const,
          timestamp: date,
          customer: doc.customer as string,
          amount: -amountBase,
        },
      ];
    },
    'treasury.cash_funds': async (doc) => {
      const cashRegisterId = doc.cashRegister as string | undefined;
      if (!cashRegisterId) return [];
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'expense' as const,
          timestamp: date,
          cashRegister: cashRegisterId,
          amount: Math.round(amount * 100) / 100,
        },
      ];
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'customer',
});
