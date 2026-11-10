import { defineDocument, field } from '@/platform/metadata';
import type { DocumentRowWithLines, PostingContext } from '@/platform/metadata';
// Side-effect import: production_report posts to inventory.stock_balance,
// so any test/runtime path that imports this doc must also register that
// register.
import '@/configs/inventory/registers/stock-balance';
import { computeLineCosts } from '@/configs/sales/documents/sales-invoice';

/**
 * `inventory.production_report` — Производственный отчёт / Production Report.
 *
 * Records the consumption of material lines and the production of a
 * single finished product, all on a single warehouse. The header carries
 * the finished product + quantity; the `materials` line section lists
 * each consumed input.
 *
 * Posting (to `inventory.stock_balance` only):
 *   - one `kind: 'expense'` movement per material line, valued at the
 *     warehouse's current weighted-average cost (via `computeLineCosts`).
 *   - one `kind: 'income'` movement for the finished product, with
 *     `totalCost` = sum of all material costs (simple BOM-less recipe).
 */
defineDocument({
  module: 'inventory',
  name: 'production_report',
  label: { en: 'Production Report', ru: 'Производственный отчёт', tr: 'Üretim Raporu' },
  pluralLabel: {
    en: 'Production Reports',
    ru: 'Производственные отчёты',
    tr: 'Üretim Raporları',
  },
  icon: 'Factory',
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
      label: { en: 'Finished Product', ru: 'Готовая продукция', tr: 'Mamul Ürün' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'product' },
    }),
    finishedQty: field.number({
      label: { en: 'Finished Qty', ru: 'Кол-во готовой', tr: 'Mamul Miktar' },
      required: true,
      min: 1,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {
    materials: {
      label: { en: 'Material', ru: 'Материал', tr: 'Malzeme' },
      pluralLabel: { en: 'Materials', ru: 'Материалы', tr: 'Malzemeler' },
      minRows: 1,
      fields: {
        product: field.reference({
          label: { en: 'Material', ru: 'Материал', tr: 'Malzeme' },
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
      const materials = (doc.lines?.materials ?? []) as Array<{
        product: string;
        quantity: number;
      }>;
      // Reuse the canonical avg-cost lookup so this doc and sales-invoice
      // can't diverge. computeLineCosts reads `doc.lines.items` + `doc.warehouse`,
      // so wrap our materials section into that shape.
      const materialDoc = {
        warehouse,
        lines: { items: materials },
      } as unknown as DocumentRowWithLines;
      const costs = await computeLineCosts(materialDoc, ctx as PostingContext);
      const date = (doc.date as Date) ?? new Date();
      const out: Array<Record<string, unknown>> = [];
      let totalMaterialCost = 0;
      materials.forEach((m, idx) => {
        const qty = Number(m.quantity ?? 0);
        if (qty <= 0) return;
        const avgCost = costs.get(idx) ?? 0;
        const lineCost = avgCost * qty;
        totalMaterialCost += lineCost;
        out.push({
          kind: 'expense' as const,
          timestamp: date,
          warehouse,
          product: m.product,
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
          totalCost: Math.round(totalMaterialCost * 100) / 100,
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
