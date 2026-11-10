import { defineDocument, field } from '@/platform/metadata';
// Side-effect imports: retail_sale posts to inventory.stock_balance,
// sales.sale, and treasury.cash_funds. Any runtime/test path that imports
// this doc must have all three registers registered too.
import '@/configs/inventory/registers/stock-balance';
import '@/configs/sales/registers/sale';
import '@/configs/treasury/registers/cash-funds';
// Side-effect: posts OUTPUT VAT to finance.vat when tax is enabled.
import '@/configs/finance/registers/vat';
import { computeVat, resolveTaxSettings } from '@/platform/engine/tax';
import type { Prisma } from '@prisma/client';

/**
 * `sales.retail_sale` — Розничная продажа / Retail sale.
 *
 * Walk-in / point-of-sale style document. Unlike `sales.invoice`, there is
 * NO named customer (cash sale). Posting fans out to three registers:
 *
 *  1. `inventory.stock_balance` — expense (one row per line) to drop stock
 *     out of the warehouse, valued at avg cost from balance snapshot.
 *  2. `sales.sale` — income (one row per line) recording quantity / cost /
 *     revenue per product, keyed by a synthetic all-zeros UUID
 *     counterparty (the conventional "anonymous retail" customer).
 *  3. `treasury.cash_funds` — income (single summed row) for the cash
 *     register receipt. Skipped if `cashRegister` is unset (deferred to a
 *     later end-of-day deposit).
 *
 * Reuses `computeLineCosts` from sales-invoice so the cost snapshot can't
 * diverge between the stock_balance and sales.sale mappers.
 */
const RETAIL_COUNTERPARTY_UUID = '00000000-0000-0000-0000-000000000000';

defineDocument({
  module: 'sales',
  name: 'retail_sale',
  label: { en: 'Retail Sale', ru: 'Розничная продажа', tr: 'Perakende Satış' },
  pluralLabel: {
    en: 'Retail Sales',
    ru: 'Розничные продажи',
    tr: 'Perakende Satışlar',
  },
  icon: 'ShoppingBag',
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
    cashRegister: field.reference({
      label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' },
      to: { kind: 'ref', module: 'treasury', name: 'cash_register' },
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {
    items: {
      label: { en: 'Item', ru: 'Товар', tr: 'Ürün' },
      pluralLabel: { en: 'Items', ru: 'Товары', tr: 'Ürünler' },
      minRows: 1,
      fields: {
        product: field.reference({
          label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
        quantity: field.number({
          label: { en: 'Quantity', ru: 'Кол-во', tr: 'Miktar' },
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
      const { computeLineCosts } = await import('@/configs/sales/documents/sales-invoice');
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
    'sales.sale': async (doc, ctx) => {
      const { computeLineCosts } = await import('@/configs/sales/documents/sales-invoice');
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
          counterparty: RETAIL_COUNTERPARTY_UUID,
          product: l.product,
          quantity: qty,
          cost,
          revenue,
        };
      });
    },
    'treasury.cash_funds': async (doc, ctx) => {
      const cashRegisterId = doc.cashRegister as string | undefined;
      if (!cashRegisterId) return [];
      const items = (doc.lines?.items ?? []) as Array<{
        quantity: number;
        price: number;
      }>;
      const total = items.reduce((a, l) => a + Number(l.quantity ?? 0) * Number(l.price ?? 0), 0);
      if (total === 0) return [];
      // The shopper pays the GROSS (subtotal + VAT) in cash when tax is enabled.
      const tax = await resolveTaxSettings(ctx.tx as Prisma.TransactionClient);
      const vat = computeVat(total, tax);
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'income' as const,
          timestamp: date,
          cashRegister: cashRegisterId,
          amount: Math.round((total + vat) * 100) / 100,
        },
      ];
    },
    // OUTPUT VAT on the retail sale (kind='income'). Anonymous walk-in → the
    // counterparty bucket is the literal 'retail'. Empty when tax is off.
    'finance.vat': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        quantity: number;
        price: number;
      }>;
      const total = items.reduce((a, l) => a + Number(l.quantity ?? 0) * Number(l.price ?? 0), 0);
      const tax = await resolveTaxSettings(ctx.tx as Prisma.TransactionClient);
      const vat = computeVat(total, tax);
      if (vat <= 0) return [];
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'income' as const,
          timestamp: date,
          counterparty: 'retail',
          amount: vat,
        },
      ];
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'warehouse',
});
