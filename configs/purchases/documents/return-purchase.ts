import { type Movement, defineDocument, field } from '@/platform/metadata';

defineDocument({
  module: 'purchases',
  name: 'return_purchase',
  direction: 'out',
  label: { en: 'Purchase Return', ru: 'Возврат поставщику', tr: 'Alış İadesi' },
  pluralLabel: {
    en: 'Purchase Returns',
    ru: 'Возвраты поставщикам',
    tr: 'Alış İadeleri',
  },
  icon: 'Undo2',
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
    warehouse: field.reference({
      label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    originalInvoice: field.reference({
      label: { en: 'Original Invoice', ru: 'Оригинальный счёт', tr: 'Asıl Fatura' },
      to: { kind: 'ref', module: 'purchases', name: 'invoice' },
      // Only offer invoices of the selected supplier — avoids picking another
      // supplier's invoice for a return (QA #75).
      filterByHeaderField: 'supplier',
    }),
    reason: field.string({
      label: { en: 'Reason', ru: 'Причина', tr: 'Sebep' },
      enumValues: ['defective', 'wrongItem', 'damagedInTransit', 'excessDelivery', 'other'],
      enumLabels: {
        defective: { en: 'Defective', ru: 'Брак', tr: 'Hatalı ürün' },
        wrongItem: { en: 'Wrong item', ru: 'Не тот товар', tr: 'Yanlış ürün' },
        damagedInTransit: {
          en: 'Damaged in transit',
          ru: 'Повреждён при доставке',
          tr: 'Sevkiyatta hasarlı',
        },
        excessDelivery: {
          en: 'Excess delivery',
          ru: 'Излишек поставки',
          tr: 'Fazla teslimat',
        },
        other: { en: 'Other', ru: 'Другое', tr: 'Diğer' },
      },
    }),
    supplierDocNo: field.string({
      label: {
        en: "Supplier's Doc No",
        ru: 'Номер документа поставщика',
        tr: 'Tedarikçi belge no',
      },
    }),
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закреплённый закупщик', tr: 'Atanan Alıcı' },
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
  validators: {
    prePost: [
      async (doc, ctx) => {
        const items = (doc.lines?.items ?? []) as Array<{
          product: string;
          quantity: number;
        }>;
        const warehouse = doc.warehouse as string;
        const demand = new Map<string, number>();
        for (const l of items) {
          demand.set(l.product, (demand.get(l.product) ?? 0) + Number(l.quantity ?? 0));
        }
        for (const [product, qty] of demand) {
          const bal = await ctx.register('inventory.stock_balance').balance({ warehouse, product });
          if ((bal.quantity ?? 0) < qty) {
            return { ok: false, message: 'INSUFFICIENT_STOCK' };
          }
        }
        return { ok: true };
      },
    ],
  },
  posting: {
    'inventory.stock_balance': async (doc) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantity: number;
        price: number;
      }>;
      const date = (doc.date as Date) ?? new Date();
      const warehouse = doc.warehouse as string;
      const rows: Movement[] = [];
      for (const l of items) {
        const qty = Number(l.quantity ?? 0);
        const lineTotal = qty * Number(l.price ?? 0);
        rows.push({
          kind: 'expense' as const,
          timestamp: date,
          warehouse,
          product: l.product,
          quantity: qty,
          totalCost: lineTotal,
        });
      }
      return rows;
    },
    'purchases.accounts_payable': async (doc) => {
      const items = (doc.lines?.items ?? []) as Array<{ quantity: number; price: number }>;
      const total = items.reduce((s, l) => s + Number(l.quantity ?? 0) * Number(l.price ?? 0), 0);
      if (total === 0) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'expense' as const,
          timestamp: date,
          supplier: doc.supplier as string,
          amount: total,
        },
      ];
    },
  },
  permissions: { read: 'any' },
  displayField: 'supplier',
});
