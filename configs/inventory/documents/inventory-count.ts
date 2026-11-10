import { type Movement, defineDocument, field } from '@/platform/metadata';

defineDocument({
  module: 'inventory',
  name: 'inventory_count',
  direction: 'in',
  label: { en: 'Inventory Count', ru: 'Инвентаризация', tr: 'Stok Sayımı' },
  pluralLabel: {
    en: 'Inventory Counts',
    ru: 'Инвентаризации',
    tr: 'Stok Sayımları',
  },
  icon: 'ListChecks',
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
    countStatus: field.string({
      label: { en: 'Count Status', ru: 'Статус подсчёта', tr: 'Sayım Durumu' },
      enumValues: ['counting', 'counted'],
      enumLabels: {
        counting: { en: 'Counting', ru: 'Идёт подсчёт', tr: 'Sayım sürüyor' },
        counted: { en: 'Counted', ru: 'Завершён', tr: 'Sayım tamamlandı' },
      },
      required: true,
    }),
    note: field.text({
      label: { en: 'Note', ru: 'Примечание', tr: 'Not' },
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
        expectedQuantity: field.number({
          label: {
            en: 'Expected',
            ru: 'Ожидаемое',
            tr: 'Beklenen',
          },
          min: 0,
        }),
        countedQuantity: field.number({
          label: {
            en: 'Counted',
            ru: 'Подсчитано',
            tr: 'Sayılan',
          },
          required: true,
          min: 0,
        }),
      },
    },
  },
  posting: {
    'inventory.stock_balance': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        expectedQuantity?: number;
        countedQuantity: number;
      }>;
      const date = (doc.date as Date) ?? new Date();
      const warehouse = doc.warehouse as string;
      const rows: Movement[] = [];

      // For each line, compute delta = counted - expected. When expected
      // is missing/null, resolve against the current stock_balance so the
      // count behaves like a "snapshot" against today's state.
      for (const l of items) {
        const counted = Number(l.countedQuantity ?? 0);
        // Read the current balance once: it gives both the expected quantity
        // (when the line omits it) and the weighted-average unit cost used to
        // value any shrinkage.
        const bal = await ctx
          .register('inventory.stock_balance')
          .balanceAll({ warehouse, product: l.product });
        const balQty = Number(bal.quantity ?? 0);
        const balCost = Number(bal.totalCost ?? 0);
        const avgUnitCost = balQty > 0 ? balCost / balQty : 0;

        let expected = Number(l.expectedQuantity ?? Number.NaN);
        if (!Number.isFinite(expected)) expected = balQty;
        const delta = counted - expected;
        if (delta === 0) continue;
        const absQty = Math.abs(delta);
        rows.push({
          kind: delta > 0 ? ('income' as const) : ('expense' as const),
          timestamp: date,
          warehouse,
          product: l.product,
          quantity: absQty,
          // Shrinkage (expense) writes off the missing units at the current
          // average cost so stock value drops proportionally and unit cost
          // stays flat (#74 — was 0, which left value inflated). Excess
          // (income) stays at zero cost; a paired stock_adjustment with an
          // explicit unitCost carries the value of unknown surplus stock.
          totalCost: delta < 0 ? absQty * avgUnitCost : 0,
        });
      }
      return rows;
    },
  },
  permissions: { read: 'any' },
  displayField: 'warehouse',
});
