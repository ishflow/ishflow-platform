import { type Movement, defineDocument, field } from '@/platform/metadata';

defineDocument({
  module: 'inventory',
  name: 'stock_transfer',
  direction: 'in',
  label: { en: 'Stock Transfer', ru: 'Перемещение запасов', tr: 'Stok Transferi' },
  pluralLabel: {
    en: 'Stock Transfers',
    ru: 'Перемещения запасов',
    tr: 'Stok Transferleri',
  },
  icon: 'ArrowLeftRight',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    sourceWarehouse: field.reference({
      label: { en: 'From Warehouse', ru: 'Со склада', tr: 'Kaynak Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    destinationWarehouse: field.reference({
      label: { en: 'To Warehouse', ru: 'На склад', tr: 'Hedef Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    reason: field.text({
      label: { en: 'Reason', ru: 'Причина', tr: 'Sebep' },
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
        quantity: field.number({
          label: { en: 'Quantity', ru: 'Количество', tr: 'Miktar' },
          required: true,
          min: 1,
        }),
      },
    },
  },
  validators: {
    prePost: [
      async (doc) => {
        if (
          doc.sourceWarehouse &&
          doc.destinationWarehouse &&
          doc.sourceWarehouse === doc.destinationWarehouse
        ) {
          return { ok: false, message: 'WAREHOUSE_SAME' };
        }
        return { ok: true };
      },
      async (doc, ctx) => {
        const items = (doc.lines?.items ?? []) as Array<{
          product: string;
          quantity: number;
        }>;
        const source = doc.sourceWarehouse as string;
        const demand = new Map<string, number>();
        for (const l of items) {
          demand.set(l.product, (demand.get(l.product) ?? 0) + Number(l.quantity ?? 0));
        }
        for (const [product, qty] of demand) {
          const bal = await ctx
            .register('inventory.stock_balance')
            .balance({ warehouse: source, product });
          if ((bal.quantity ?? 0) < qty) {
            return { ok: false, message: 'INSUFFICIENT_STOCK' };
          }
        }
        return { ok: true };
      },
    ],
  },
  posting: {
    'inventory.stock_balance': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{ product: string; quantity: number }>;
      const date = (doc.date as Date) ?? new Date();
      const source = doc.sourceWarehouse as string;
      const dest = doc.destinationWarehouse as string;
      const rows: Movement[] = [];

      // For each line: resolve avg cost at source, emit paired expense+income.
      const balanceFor = async (product: string) => {
        const bal = await ctx
          .register('inventory.stock_balance')
          .balanceAll({ warehouse: source, product });
        const qty = Number(bal.quantity ?? 0);
        const totalCost = Number(bal.totalCost ?? 0);
        const avg = qty > 0 ? totalCost / qty : 0;
        return { qty, avg };
      };

      for (const l of items) {
        const moveQty = Number(l.quantity ?? 0);
        if (moveQty <= 0) continue;
        const { avg } = await balanceFor(l.product);
        const lineTotal = moveQty * avg;
        rows.push({
          kind: 'expense' as const,
          timestamp: date,
          warehouse: source,
          product: l.product,
          quantity: moveQty,
          totalCost: lineTotal,
        });
        rows.push({
          kind: 'income' as const,
          timestamp: date,
          warehouse: dest,
          product: l.product,
          quantity: moveQty,
          totalCost: lineTotal,
        });
      }
      return rows;
    },
  },
  permissions: { read: 'any' },
  displayField: 'sourceWarehouse',
});
