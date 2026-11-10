import { computeLineCosts } from '@/configs/sales/documents/sales-invoice';
import { type Movement, defineDocument, field } from '@/platform/metadata';

defineDocument({
  module: 'sales',
  name: 'return_invoice',
  direction: 'out',
  label: { en: 'Sales Return', ru: 'Возврат от покупателя', tr: 'Satış İadesi' },
  pluralLabel: {
    en: 'Sales Returns',
    ru: 'Возвраты от покупателей',
    tr: 'Satış İadeleri',
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
    warehouse: field.reference({
      label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    originalInvoice: field.reference({
      label: { en: 'Original Invoice', ru: 'Оригинальный счёт', tr: 'Asıl Fatura' },
      to: { kind: 'ref', module: 'sales', name: 'invoice' },
      // Only offer invoices of the selected customer — mirrors the purchase
      // return; prevents picking another customer's invoice (QA #75 pattern).
      filterByHeaderField: 'customer',
    }),
    reason: field.string({
      label: { en: 'Reason', ru: 'Причина', tr: 'Sebep' },
      enumValues: ['defective', 'customerCancel', 'damaged', 'warranty'],
      enumLabels: {
        defective: { en: 'Defective', ru: 'Брак', tr: 'Hatalı ürün' },
        customerCancel: {
          en: 'Customer cancelled',
          ru: 'Покупатель отказался',
          tr: 'Müşteri vazgeçti',
        },
        damaged: { en: 'Damaged on delivery', ru: 'Повреждён', tr: 'Hasarlı teslim' },
        warranty: { en: 'Warranty', ru: 'Гарантия', tr: 'Garanti' },
      },
    }),
    assignedRepId: field.string({
      label: { en: 'Assigned Rep', ru: 'Закреплённый менеджер', tr: 'Atanan Temsilci' },
      formHidden: true,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {
    items: {
      label: { en: 'Line', ru: 'Строка', tr: 'Satır' },
      pluralLabel: { en: 'Lines', ru: 'Строки', tr: 'Satırlar' },
      minRows: 1,
      lineBehavior: 'returnFromInvoice',
      fields: {
        product: field.reference({
          label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
        quantity: field.number({
          label: { en: 'Quantity', ru: 'Количество', tr: 'Miktar' },
          required: true,
          min: 1,
        }),
        price: field.money({
          label: { en: 'Price', ru: 'Цена', tr: 'Fiyat' },
          required: true,
        }),
      },
    },
  },
  posting: {
    'inventory.stock_balance': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantity: number;
      }>;
      const date = (doc.date as Date) ?? new Date();
      const warehouse = doc.warehouse as string;
      const costs = await computeLineCosts(doc, ctx);
      const rows: Movement[] = items.map((l, idx) => ({
        kind: 'income' as const,
        timestamp: date,
        warehouse,
        product: l.product,
        quantity: Number(l.quantity ?? 0),
        totalCost: (costs.get(idx) ?? 0) * Number(l.quantity ?? 0),
      }));
      return rows;
    },
    'sales.accounts_receivable': async (doc) => {
      const items = (doc.lines?.items ?? []) as Array<{ quantity: number; price: number }>;
      const total = items.reduce((s, l) => s + Number(l.quantity ?? 0) * Number(l.price ?? 0), 0);
      if (total === 0) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'expense' as const,
          timestamp: date,
          customer: doc.customer as string,
          amount: Math.round(total * 100) / 100,
        },
      ];
    },
    'sales.sale': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantity: number;
        price: number;
      }>;
      const date = (doc.date as Date) ?? new Date();
      const costs = await computeLineCosts(doc, ctx);
      return items.map((l, idx) => {
        const qty = Number(l.quantity ?? 0);
        const price = Number(l.price ?? 0);
        const revenue = Math.round(qty * price * 100) / 100;
        const cost = (costs.get(idx) ?? 0) * qty;
        return {
          kind: 'expense' as const,
          timestamp: date,
          counterparty: doc.customer as string,
          product: l.product,
          quantity: qty,
          cost,
          revenue,
        };
      });
    },
  },
  permissions: { read: 'any' },
  displayField: 'customer',
});
