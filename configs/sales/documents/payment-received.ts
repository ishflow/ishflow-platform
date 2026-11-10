import { defineDocument, field } from '@/platform/metadata';

function parseLinkedInvoices(raw: unknown): Array<{ invoiceId: string; amount: number }> | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (item): item is { invoiceId: string; amount: number } =>
        item && typeof item.invoiceId === 'string' && typeof item.amount === 'number',
    );
  } catch {
    return null;
  }
}

defineDocument({
  module: 'sales',
  name: 'payment_received',
  direction: 'in',
  label: { en: 'Payment Received', ru: 'Поступление оплаты', tr: 'Ödeme Tahsilatı' },
  pluralLabel: {
    en: 'Payments Received',
    ru: 'Оплата от покупателя',
    tr: 'Ödeme Tahsilatları',
  },
  icon: 'ArrowDownToLine',
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
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
    }),
    linkedInvoices: field.documentLink({
      label: {
        en: 'Linked invoice',
        ru: 'Документ-основание',
        tr: 'Bağlı fatura',
      },
      to: { kind: 'ref', module: 'sales', name: 'invoice' },
      filterByHeaderField: 'customer',
      amountSource: 'openBalance',
    }),
    amount: field.money({
      label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
      required: true,
    }),
    note: field.text({
      label: { en: 'Note', ru: 'Примечание', tr: 'Not' },
    }),
    assignedRepId: field.string({
      label: { en: 'Assigned Rep', ru: 'Закреплённый менеджер', tr: 'Atanan Temsilci' },
      // denormalized from customer.assignedRepId at create time
    }),
  },
  posting: {
    'sales.accounts_receivable': async (doc) => {
      const amount = Number(doc.amount);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const date = (doc.date as Date) ?? new Date();
      const linked = parseLinkedInvoices(doc.linkedInvoices);

      if (linked && linked.length > 0) {
        const linkedTotal = linked.reduce((sum, li) => sum + li.amount, 0);
        if (Math.abs(linkedTotal - amount) > 0.001) {
          throw new Error('INVALID_LINKED_TOTAL');
        }
        return linked.map((li) => ({
          kind: 'expense' as const,
          timestamp: date,
          customer: doc.customer as string,
          amount: Math.round(li.amount * 100) / 100,
          relatedDocRef: li.invoiceId,
        }));
      }

      return [
        {
          kind: 'expense' as const,
          timestamp: date,
          customer: doc.customer as string,
          amount: Math.round(amount * 100) / 100,
        },
      ];
    },
    'treasury.cash_funds': async (doc) => {
      const amount = Number(doc.amount);
      if (!Number.isFinite(amount) || amount === 0) return [];
      const cashRegister = doc.cashRegister as string | undefined;
      if (!cashRegister) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'income' as const,
          timestamp: date,
          cashRegister,
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
