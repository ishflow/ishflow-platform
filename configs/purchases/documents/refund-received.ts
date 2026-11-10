import { defineDocument, field } from '@/platform/metadata';
// Side-effect imports: refund_received posts to AP + cash_funds, so any
// test/runtime path that imports this doc must have both registers loaded.
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/treasury/registers/cash-funds';

/**
 * `purchases.refund_received` — Возврат от поставщика / Refund from Supplier.
 *
 * Cash refund received from a supplier (typically following a
 * return-purchase or supplier overpayment). Header-only — no lines; the
 * header carries a single amount and an optional cashRegister.
 *
 * Posting (mirror of sales.refund_payment, swapping AR↔AP and cash
 * direction):
 *   - `purchases.accounts_payable`: kind=`expense` with NEGATIVE amount
 *     so the AP balance moves UP (we owe the supplier again — the
 *     refund creates open balance until the next bill closes it).
 *   - `treasury.cash_funds`: kind=`income` with positive amount
 *     (cash arrives in the register).
 */
defineDocument({
  module: 'purchases',
  name: 'refund_received',
  direction: 'in',
  label: { en: 'Refund from Supplier', ru: 'Возврат от поставщика', tr: 'Tedarikçi İadesi' },
  pluralLabel: {
    en: 'Refunds from Suppliers',
    ru: 'Возвраты от поставщиков',
    tr: 'Tedarikçi İadeleri',
  },
  icon: 'Undo',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    supplier: field.reference({
      label: { en: 'Supplier', ru: 'Поставщик', tr: 'Tedarikçi' },
      required: true,
      to: { kind: 'ref', module: 'purchases', name: 'supplier' },
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
    'purchases.accounts_payable': async (doc) => {
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          // Inverse of payment-sent: 'expense' with negative amount
          // pushes AP UP (the refund re-opens our claim on the supplier).
          kind: 'expense' as const,
          timestamp: date,
          supplier: doc.supplier as string,
          amount: -amount,
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
          kind: 'income' as const,
          timestamp: date,
          cashRegister: cashRegisterId,
          amount,
        },
      ];
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'supplier',
});
