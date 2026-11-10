import { defineDocument, field } from '@/platform/metadata';
// Side-effect imports: this doc posts to purchases.accounts_payable
// (closes AP) and treasury.bank_funds (debits the bank account).
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/treasury/registers/bank-funds';

/**
 * `purchases.bank_payment` — Платёж через банк / Bank Payment.
 *
 * Counterpart to `purchases.payment_sent` but settles the supplier from
 * a bank account instead of a kasa. Single-doc, no lines, single
 * user-entered amount. Posting writes:
 *
 *   - `purchases.accounts_payable` kind=expense (closes AP)
 *   - `treasury.bank_funds` kind=expense (debits the bank balance)
 */
defineDocument({
  module: 'purchases',
  name: 'bank_payment',
  direction: 'out',
  label: { en: 'Bank Payment', ru: 'Платёж через банк', tr: 'Banka Ödemesi' },
  pluralLabel: {
    en: 'Bank Payments',
    ru: 'Платежи через банк',
    tr: 'Banka Ödemeleri',
  },
  icon: 'Banknote',
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
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закупщик', tr: 'Alıcı' },
      formHidden: true,
    }),
  },
  lines: {},
  posting: {
    'purchases.accounts_payable': async (doc) => {
      const amount = Number(doc.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return [];
      return [
        {
          kind: 'expense' as const, // closes AP
          timestamp: (doc.date as Date) ?? new Date(),
          supplier: doc.supplier as string,
          amount,
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
          kind: 'expense' as const,
          timestamp: (doc.date as Date) ?? new Date(),
          bankAccount,
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
