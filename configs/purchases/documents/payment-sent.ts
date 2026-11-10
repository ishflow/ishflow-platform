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
  module: 'purchases',
  name: 'payment_sent',
  direction: 'out',
  label: { en: 'Payment Sent', ru: 'Платёж поставщику', tr: 'Tedarikçi Ödemesi' },
  pluralLabel: {
    en: 'Payments Sent',
    ru: 'Оплата поставщику',
    tr: 'Tedarikçi Ödemeleri',
  },
  icon: 'ArrowUpFromLine',
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
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
    }),
    linkedInvoices: field.documentLink({
      label: {
        en: 'Linked invoice',
        ru: 'Документ-основание',
        tr: 'Bağlı fatura',
      },
      to: { kind: 'ref', module: 'purchases', name: 'invoice' },
      filterByHeaderField: 'supplier',
      amountSource: 'openBalance',
    }),
    amount: field.money({
      label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
      required: true,
    }),
    note: field.text({
      label: { en: 'Note', ru: 'Примечание', tr: 'Not' },
    }),
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закреплённый закупщик', tr: 'Atanan Alıcı' },
      formHidden: true,
    }),
  },
  validators: {
    prePost: [
      async (doc, ctx) => {
        const amount = Number(doc.amount);
        if (!Number.isFinite(amount) || amount <= 0) return { ok: true };
        const cashRegister = doc.cashRegister as string | undefined;
        if (!cashRegister) return { ok: true };
        const bag = ctx.tx as unknown as {
          catalog_treasury_cash_register: {
            findUnique: (args: {
              where: { id: string };
              select: { openingBalance: true };
            }) => Promise<{ openingBalance: unknown } | null>;
          };
          movement_treasury_cash_funds: {
            aggregate: (args: {
              where: Record<string, unknown>;
              _sum: { amount?: true };
            }) => Promise<{ _sum: { amount: unknown } }>;
          };
        };
        const cr = await bag.catalog_treasury_cash_register.findUnique({
          where: { id: cashRegister },
          select: { openingBalance: true },
        });
        const opening = Number(cr?.openingBalance ?? 0);
        const incAgg = await bag.movement_treasury_cash_funds.aggregate({
          where: { cashRegister, kind: 'income', active: true },
          _sum: { amount: true },
        });
        const expAgg = await bag.movement_treasury_cash_funds.aggregate({
          where: { cashRegister, kind: 'expense', active: true },
          _sum: { amount: true },
        });
        const movements = Number(incAgg._sum.amount ?? 0) - Number(expAgg._sum.amount ?? 0);
        const onHand = movements + opening;
        if (onHand < amount) {
          return { ok: false, message: 'INSUFFICIENT_CASH' };
        }
        return { ok: true };
      },
    ],
  },
  posting: {
    'purchases.accounts_payable': async (doc) => {
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
          supplier: doc.supplier as string,
          amount: li.amount,
          relatedDocRef: li.invoiceId,
        }));
      }

      return [
        {
          kind: 'expense' as const,
          timestamp: date,
          supplier: doc.supplier as string,
          amount,
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
          kind: 'expense' as const,
          timestamp: date,
          cashRegister,
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
