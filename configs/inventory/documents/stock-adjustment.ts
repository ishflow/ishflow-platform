import { type Movement, defineDocument, field } from '@/platform/metadata';

defineDocument({
  module: 'inventory',
  name: 'stock_adjustment',
  direction: 'in',
  label: { en: 'Stock Adjustment', ru: 'Корректировка запасов', tr: 'Stok Düzeltme' },
  pluralLabel: {
    en: 'Stock Adjustments',
    ru: 'Корректировки запасов',
    tr: 'Stok Düzeltmeleri',
  },
  icon: 'ClipboardCheck',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    warehouse: field.reference({
      label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    reason: field.text({
      label: { en: 'Reason', ru: 'Причина', tr: 'Sebep' },
    }),
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закреплённый закупщик', tr: 'Atanan Alıcı' },
      formHidden: true,
    }),
  },
  lines: {
    items: {
      label: { en: 'Line', ru: 'Строка', tr: 'Satır' },
      pluralLabel: { en: 'Lines', ru: 'Строки', tr: 'Satırlar' },
      minRows: 1,
      fields: {
        product: field.reference({
          label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
        quantityDelta: field.number({
          label: { en: 'Quantity Δ', ru: 'Δ количества', tr: 'Miktar Δ' },
          required: true,
          min: -1_000_000,
          max: 1_000_000,
        }),
        unitCost: field.money({
          label: { en: 'Unit Cost', ru: 'Себестоимость', tr: 'Birim Maliyet' },
        }),
      },
    },
  },
  posting: {
    'inventory.stock_balance': async (doc) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantityDelta: number;
        unitCost?: number | null;
      }>;
      const date = (doc.date as Date) ?? new Date();
      const warehouse = doc.warehouse as string;
      const rows: Movement[] = [];
      for (const l of items) {
        const delta = Number(l.quantityDelta ?? 0);
        if (delta === 0) continue;
        const absQty = Math.abs(delta);
        const cost = Number(l.unitCost ?? 0);
        // Income on positive delta: stock added, total cost = absQty * cost.
        // Expense on negative delta: stock removed; totalCost will be
        // recomputed by the register helper against the current avg if
        // unitCost is missing — we pass through whatever the user typed
        // (parity with how V1 stock_balance accepts both).
        const lineTotal = absQty * cost;
        rows.push({
          kind: delta > 0 ? ('income' as const) : ('expense' as const),
          timestamp: date,
          warehouse,
          product: l.product,
          quantity: absQty,
          totalCost: lineTotal,
        });
      }
      return rows;
    },
  },
  permissions: { read: 'any' },
  displayField: 'warehouse',
});
