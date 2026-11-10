import { defineDocument, field } from '@/platform/metadata';
import type { DocumentRowWithLines, PostingContext } from '@/platform/metadata';
// Side-effect import: disassembly posts to inventory.stock_balance, so any
// test/runtime path that imports this doc must also register that register.
import '@/configs/inventory/registers/stock-balance';
import { computeLineCosts } from '@/configs/sales/documents/sales-invoice';

/**
 * `inventory.disassembly` — Разукомплектация / Disassembly.
 *
 * Reverse of `assembly`: consume a single source kit and produce N
 * component lines on one warehouse. The source kit's average cost is
 * distributed across the produced components proportionally to their
 * quantity share — pragmatic vs 1C's configurable allocation rules.
 *
 * Posting (to `inventory.stock_balance` only):
 *   - one `kind: 'expense'` for the source kit at warehouse avg cost.
 *   - one `kind: 'income'` per component line, sharing the total source
 *     cost proportionally by quantity.
 */
defineDocument({
  module: 'inventory',
  name: 'disassembly',
  label: { en: 'Disassembly', ru: 'Разукомплектация', tr: 'Ayırma' },
  pluralLabel: {
    en: 'Disassemblies',
    ru: 'Разукомплектации',
    tr: 'Ayırmalar',
  },
  icon: 'PackageOpen',
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
    sourceProduct: field.reference({
      label: { en: 'Source Kit', ru: 'Исходный комплект', tr: 'Kaynak Kit' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'product' },
    }),
    sourceQty: field.number({
      label: { en: 'Source Qty', ru: 'Кол-во комплектов', tr: 'Kit Miktar' },
      required: true,
      min: 1,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {
    components: {
      label: { en: 'Component', ru: 'Компонент', tr: 'Bileşen' },
      pluralLabel: { en: 'Components', ru: 'Компоненты', tr: 'Bileşenler' },
      minRows: 1,
      fields: {
        product: field.reference({
          label: { en: 'Component', ru: 'Компонент', tr: 'Bileşen' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
        quantity: field.number({
          label: { en: 'Qty', ru: 'Кол-во', tr: 'Miktar' },
          required: true,
          min: 1,
        }),
      },
    },
  },
  posting: {
    'inventory.stock_balance': async (doc, ctx) => {
      const warehouse = doc.warehouse as string;
      const sourceProduct = doc.sourceProduct as string | undefined;
      const sourceQty = Number(doc.sourceQty ?? 0);
      const components = (doc.lines?.components ?? []) as Array<{
        product: string;
        quantity: number;
      }>;
      const date = (doc.date as Date) ?? new Date();

      // Look up source kit avg cost via the canonical helper.
      const sourceDoc = {
        warehouse,
        lines: { items: [{ product: sourceProduct ?? '', quantity: sourceQty }] },
      } as unknown as DocumentRowWithLines;
      const sourceCosts = await computeLineCosts(sourceDoc, ctx as PostingContext);
      const sourceAvgCost = sourceCosts.get(0) ?? 0;
      const totalSourceCost = sourceAvgCost * sourceQty;

      const out: Array<Record<string, unknown>> = [];

      // Expense the source kit.
      if (sourceQty > 0 && sourceProduct) {
        out.push({
          kind: 'expense' as const,
          timestamp: date,
          warehouse,
          product: sourceProduct,
          quantity: sourceQty,
          totalCost: Math.round(totalSourceCost * 100) / 100,
        });
      }

      // Income each component, distributing source cost by quantity share.
      const totalCompUnits = components.reduce((a, c) => a + Number(c.quantity ?? 0), 0);
      for (const c of components) {
        const qty = Number(c.quantity ?? 0);
        if (qty <= 0) continue;
        const share = totalCompUnits > 0 ? (qty / totalCompUnits) * totalSourceCost : 0;
        out.push({
          kind: 'income' as const,
          timestamp: date,
          warehouse,
          product: c.product,
          quantity: qty,
          totalCost: Math.round(share * 100) / 100,
        });
      }
      return out;
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'sourceProduct',
});
