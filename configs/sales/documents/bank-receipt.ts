import { defineDocument, field } from '@/platform/metadata';
// Side-effect imports: this doc posts to sales.accounts_receivable
// (closes AR) and treasury.bank_funds (credits the bank account).
import '@/configs/sales/registers/accounts-receivable';
import '@/configs/treasury/registers/bank-funds';

/**
 * `sales.bank_receipt` — Поступление на счёт / Bank Receipt.
 *
 * Counterpart to `sales.payment_received` but the customer pays into a
 * bank account instead of a kasa. Single-doc, no lines, single
 * user-entered amount. Posting writes:
 *
 *   - `sales.accounts_receivable` kind=expense (closes AR)
 *   - `treasury.bank_funds` kind=income (credits the bank balance)
 */
defineDocument({
  module: 'sales',
  name: 'bank_receipt',
  direction: 'in',
  label: { en: 'Bank Receipt', ru: 'Поступление на счёт', tr: 'Banka Tahsilatı' },
  pluralLabel: {
    en: 'Bank Receipts',
    ru: 'Поступления на счёт',
    tr: 'Banka Tahsilatları',
  },
  icon: 'PiggyBank',
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
    bankAccount: field.reference({
      label: { en: 'Bank Account', ru: 'Банковский счёт', tr: 'Banka Hesabı' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'bank_account' },
    }),
    amount: field.money({
      label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
      required: true,
    }),
    linkedInvoices: field.text({
      label: { en: 'Linked Invoices', ru: 'Связанные счета', tr: 'Bağlı Faturalar' },
      formHidden: true,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
    assignedRepId: field.string({
      label: { en: 'Assigned Rep', ru: 'Закреплённый менеджер', tr: 'Atanan Temsilci' },
      formHidden: true,
    }),
  },
  lines: {},
  posting: {
    'sales.accounts_receivable': async (doc) => {
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      return [
        {
          kind: 'expense' as const, // closes AR
          timestamp: (doc.date as Date) ?? new Date(),
          customer: doc.customer as string,
          amount: Math.round(amount * 100) / 100,
        },
      ];
    },
    'treasury.bank_funds': async (doc) => {
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const bankAccount = doc.bankAccount as string | undefined;
      if (!bankAccount) return [];
      return [
        {
          kind: 'income' as const,
          timestamp: (doc.date as Date) ?? new Date(),
          bankAccount,
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
