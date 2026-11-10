// Side-effect: this doc posts OUTPUT VAT to finance.vat, so that register must
// be registered wherever this config is loaded (not only via configs/index).
import '@/configs/finance/registers/vat';
import { computeVat, resolveTaxSettings } from '@/platform/engine/tax';
import { defineDocument, field } from '@/platform/metadata';
import type { DocumentRowWithLines, PostingContext } from '@/platform/metadata';
import type { Prisma } from '@prisma/client';

/**
 * Read stock_balance balance once per distinct (warehouse, product) pair that
 * appears in this document's item lines, then return a snapshot map of
 * `lineIndex -> avgCost`. avgCost = totalCost / quantity, or 0 when quantity is
 * zero. Used by both the stock_balance expense mapper and the sales.sale cost
 * mapper so they can't diverge from mid-posting balance mutations.
 */
export async function computeLineCosts(
  doc: DocumentRowWithLines,
  ctx: PostingContext,
): Promise<Map<number, number>> {
  const warehouse = doc.warehouse as string;
  const items = (doc.lines?.items ?? []) as Array<{
    product: string;
    quantity: number;
  }>;
  const snapshots = new Map<string, { quantity: number; totalCost: number }>();
  for (const l of items) {
    const key = `${warehouse}::${l.product}`;
    if (snapshots.has(key)) continue;
    const bal = await ctx
      .register('inventory.stock_balance')
      .balanceAll({ warehouse, product: l.product });
    snapshots.set(key, {
      quantity: Number(bal.quantity ?? 0),
      totalCost: Number(bal.totalCost ?? 0),
    });
  }
  const out = new Map<number, number>();
  items.forEach((l, idx) => {
    const snap = snapshots.get(`${warehouse}::${l.product}`);
    if (!snap) return;
    const avg = snap.quantity > 0 ? snap.totalCost / snap.quantity : 0;
    out.set(idx, avg);
  });
  return out;
}

defineDocument({
  module: 'sales',
  name: 'invoice',
  label: { en: 'Sales Invoice', ru: 'Счёт-фактура', tr: 'Satış Faturası' },
  pluralLabel: {
    en: 'Sales Invoices',
    ru: 'Реализация товар и услуг',
    tr: 'Satış Faturaları',
  },
  icon: 'Receipt',
  header: {
    // Distinct numbering series so sales and purchase invoices don't collide
    // on a shared INVOICE-0000xx sequence (QA #25). docNumber maps to the
    // existing top-level `number` column — no schema change.
    number: field.docNumber({
      label: { en: 'No.', ru: '№', tr: 'No' },
      prefix: 'SI-',
      formHidden: true,
    }),
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
    priceType: field.reference({
      label: { en: 'Price Type', ru: 'Тип цен', tr: 'Fiyat Türü' },
      to: { kind: 'ref', module: 'sales', name: 'price_type' },
    }),
    warehouse: field.reference({
      label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    assignedRepId: field.string({
      label: { en: 'Assigned Rep', ru: 'Закреплённый менеджер', tr: 'Atanan Temsilci' },
      formHidden: true,
      // denormalized from customer.assignedRepId at create time
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
      // Sprint 30: product-first flow, stock-aware reference filtering,
      // chip row + auto-price hint via LineFieldArray.
      lineBehavior: 'sales',
      fields: {
        product: field.reference({
          label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
          referenceFilter: 'hasStockGt0',
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
      // Outgoing inventory is valued at the warehouse's avg cost.
      const warehouse = doc.warehouse as string;
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantity: number;
      }>;
      const costs = await computeLineCosts(doc, ctx);
      const date = (doc.date as Date) ?? new Date();
      return items.map((l, idx) => ({
        kind: 'expense' as const,
        timestamp: date,
        warehouse,
        product: l.product,
        quantity: Number(l.quantity ?? 0),
        totalCost: (costs.get(idx) ?? 0) * Number(l.quantity ?? 0),
      }));
    },
    'sales.accounts_receivable': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        quantity: number;
        price: number;
      }>;
      const subtotal = items.reduce(
        (acc, l) => acc + Number(l.quantity ?? 0) * Number(l.price ?? 0),
        0,
      );
      if (!Number.isFinite(subtotal) || subtotal === 0) return [];
      // The customer owes the GROSS (subtotal + VAT) when tax is enabled.
      const tax = await resolveTaxSettings(ctx.tx as Prisma.TransactionClient);
      const vat = computeVat(subtotal, tax);
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'income' as const,
          timestamp: date,
          customer: doc.customer as string,
          amount: Math.round((subtotal + vat) * 100) / 100,
        },
      ];
    },
    // OUTPUT VAT collected on this sale (kind='income' = liability owed to the
    // state). Empty when tax is disabled — see platform/engine/tax.ts.
    'finance.vat': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        quantity: number;
        price: number;
      }>;
      const subtotal = items.reduce(
        (acc, l) => acc + Number(l.quantity ?? 0) * Number(l.price ?? 0),
        0,
      );
      const tax = await resolveTaxSettings(ctx.tx as Prisma.TransactionClient);
      const vat = computeVat(subtotal, tax);
      if (vat <= 0) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'income' as const,
          timestamp: date,
          counterparty: doc.customer as string,
          amount: vat,
        },
      ];
    },
    'sales.sale': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantity: number;
        price: number;
      }>;
      const costs = await computeLineCosts(doc, ctx);
      const date = (doc.date as Date) ?? new Date();
      return items.map((l, idx) => {
        const qty = Number(l.quantity ?? 0);
        const price = Number(l.price ?? 0);
        const revenue = Math.round(qty * price * 100) / 100;
        const cost = (costs.get(idx) ?? 0) * qty;
        return {
          kind: 'income' as const,
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
  validators: {
    prePost: [
      async (doc, ctx) => {
        const warehouse = doc.warehouse as string;
        const items = (doc.lines?.items ?? []) as Array<{
          product: string;
          quantity: number;
        }>;
        const demand = new Map<string, number>();
        for (const l of items) {
          demand.set(l.product, (demand.get(l.product) ?? 0) + Number(l.quantity ?? 0));
        }
        for (const [product, qty] of demand) {
          const balance = await ctx
            .register('inventory.stock_balance')
            .balance({ warehouse, product });
          if (balance.quantity < qty) {
            return { ok: false, message: 'insufficientStock' };
          }
        }
        return { ok: true };
      },
      // Sprint 30: block below-cost sales. Cost comes from the same
      // stock_balance register as the expense mapper.
      async (doc, ctx) => {
        const items = (doc.lines?.items ?? []) as Array<{
          product: string;
          price: number;
        }>;
        const costs = await computeLineCosts(doc, ctx);
        for (let i = 0; i < items.length; i++) {
          const cost = costs.get(i) ?? 0;
          const price = Number(items[i]?.price ?? 0);
          if (cost > 0 && price < cost) {
            return { ok: false, message: 'belowCost' };
          }
        }
        return { ok: true };
      },
    ],
  },
  permissions: {
    read: 'any',
  },
  displayField: 'customer',
  rowActions: [
    {
      key: 'recordPayment',
      target: 'sales.payment_received',
      icon: 'HandCoins',
      label: {
        en: 'Record payment',
        ru: 'Принять оплату',
        tr: 'Tahsilat al',
      },
      visibleWhen: {
        status: 'POSTED',
        openBalance: { register: 'sales.accounts_receivable' },
      },
      map: {
        customer: { source: 'self.field', field: 'customer' },
        customerName: { source: 'refLabel', field: 'customer' },
        invoice: { source: 'self.id' },
        invoiceNumber: { source: 'self.field', field: 'number' },
        amount: { source: 'openBalance.original' },
      },
    },
  ],
});
