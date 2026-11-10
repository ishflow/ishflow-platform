import { defineDocument, field } from '@/platform/metadata';
// Side-effect import: expense_report posts to the treasury.cash_funds register,
// so any test/runtime path that imports this doc must have the register
// registered too. Same pattern as payment-received → fx-pl.
import '@/configs/treasury/registers/cash-funds';

/**
 * `treasury.expense_report` — Авансовый отчёт / Expense report.
 *
 * Records out-of-pocket expenses by an employee (typically reimbursed from
 * petty cash). Each line is a single receipt; posting drops one
 * `kind: 'expense'` movement per line into `treasury.cash_funds`, keyed by
 * the chosen cash register. The granular (per-line) movement layout
 * mirrors 1C convention and keeps the audit trail tight against the
 * source receipts.
 */
defineDocument({
  module: 'treasury',
  name: 'expense_report',
  label: { en: 'Expense Report', ru: 'Авансовый отчёт', tr: 'Masraf Raporu' },
  pluralLabel: {
    en: 'Expense Reports',
    ru: 'Авансовые отчёты',
    tr: 'Masraf Raporları',
  },
  icon: 'Wallet',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    employee: field.string({
      label: { en: 'Employee', ru: 'Сотрудник', tr: 'Çalışan' },
      maxLength: 128,
    }),
    cashRegister: field.reference({
      label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' },
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
    }),
    purpose: field.string({
      label: { en: 'Purpose', ru: 'Назначение', tr: 'Amaç' },
      maxLength: 256,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {
    items: {
      label: { en: 'Item', ru: 'Расход', tr: 'Kalem' },
      pluralLabel: { en: 'Items', ru: 'Расходы', tr: 'Kalemler' },
      minRows: 1,
      fields: {
        category: field.string({
          label: { en: 'Category', ru: 'Категория', tr: 'Kategori' },
          maxLength: 64,
        }),
        description: field.string({
          label: { en: 'Description', ru: 'Описание', tr: 'Açıklama' },
          maxLength: 256,
        }),
        amount: field.money({
          label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
          required: true,
        }),
        receipt: field.string({
          label: { en: 'Receipt', ru: 'Чек', tr: 'Fiş' },
          maxLength: 128,
        }),
      },
    },
  },
  posting: {
    'treasury.cash_funds': async (doc) => {
      const items = (doc.lines?.items ?? []) as Array<{ amount: number }>;
      const cashRegisterId = doc.cashRegister as string | undefined;
      if (!cashRegisterId) return [];
      const date = (doc.date as Date) ?? new Date();
      return items
        .filter((l) => Number(l.amount ?? 0) > 0)
        .map((l) => ({
          kind: 'expense' as const,
          timestamp: date,
          cashRegister: cashRegisterId,
          amount: Number(l.amount),
        }));
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'employee',
});
