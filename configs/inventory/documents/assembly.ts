import { defineDocument, field } from '@/platform/metadata';
import type { DocumentRowWithLines, PostingContext } from '@/platform/metadata';
// Side-effect import: assembly posts to inventory.stock_balance, so any
// test/runtime path that imports this doc must also register that register.
import '@/configs/inventory/registers/stock-balance';
import { computeLineCosts } from '@/configs/sales/documents/sales-invoice';

/**
 * `inventory.assembly` — Сборка номенклатуры / Assembly.
 *
 * Consume component lines and produce a single finished kit on one
 * warehouse. Same shape as `production_report` but renamed for clarity
 * — this is the canonical 1C operation for "make a kit out of parts".
 *
 * Posting (to `inventory.stock_balance` only):
 *   - one `kind: 'expense'` per component line, valued at the warehouse's
 *     current weighted-average cost (via `computeLineCosts`).
 *   - one `kind: 'income'` for the finished kit, with `totalCost` = sum
 *     of all component costs.
 */
defineDocument({
  module: 'inventory',
  name: 'assembly',
  label: { en: 'Assembly', ru: 'Сборка номенклатуры', tr: 'Komplekt' },
  pluralLabel: {
    en: 'Assemblies',
    ru: 'Сборки номенклатуры',
    tr: 'Komplektler',
  },
  icon: 'Boxes',
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
    finishedProduct: field.reference({
      label: { en: 'Kit Product', ru: 'Готовый комплект', tr: 'Mamul Kit' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'product' },
    }),
    finishedQty: field.number({
      label: { en: 'Kit Qty', ru: 'Кол-во комплектов', tr: 'Kit Miktar' },
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
      const components = (doc.lines?.components ?? []) as Array<{
        product: string;
        quantity: number;
      }>;
      // Reuse the canonical avg-cost lookup so this doc, production-report
      // and sales-invoice can't diverge. computeLineCosts reads
      // `doc.lines.items` + `doc.warehouse`, so wrap our components section
      // into that shape.
      const componentDoc = {
        warehouse,
        lines: { items: components },
      } as unknown as DocumentRowWithLines;
      const costs = await computeLineCosts(componentDoc, ctx as PostingContext);
      const date = (doc.date as Date) ?? new Date();
      const out: Array<Record<string, unknown>> = [];
      let totalComponentCost = 0;
      components.forEach((c, idx) => {
        const qty = Number(c.quantity ?? 0);
        if (qty <= 0) return;
        const avgCost = costs.get(idx) ?? 0;
        const lineCost = avgCost * qty;
        totalComponentCost += lineCost;
        out.push({
          kind: 'expense' as const,
          timestamp: date,
          warehouse,
          product: c.product,
          quantity: qty,
          totalCost: Math.round(lineCost * 100) / 100,
        });
      });
      const finishedQty = Number(doc.finishedQty ?? 0);
      const finishedProduct = doc.finishedProduct as string | undefined;
      if (finishedQty > 0 && finishedProduct) {
        out.push({
          kind: 'income' as const,
          timestamp: date,
          warehouse,
          product: finishedProduct,
          quantity: finishedQty,
          totalCost: Math.round(totalComponentCost * 100) / 100,
        });
      }
      return out;
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'finishedProduct',
});
