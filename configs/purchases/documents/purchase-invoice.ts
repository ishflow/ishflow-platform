// Side-effect: this doc posts INPUT VAT to finance.vat, so that register must
// be registered wherever this config is loaded (not only via configs/index).
import '@/configs/finance/registers/vat';
import { computeVat, resolveTaxSettings } from '@/platform/engine/tax';
import { type Movement, defineDocument, field } from '@/platform/metadata';
import type { Prisma } from '@prisma/client';

defineDocument({
  module: 'purchases',
  name: 'invoice',
  label: { en: 'Purchase Invoice', ru: 'Счёт от поставщика', tr: 'Alış Faturası' },
  pluralLabel: {
    en: 'Purchase Invoices',
    ru: 'Поступление товар и услуг',
    tr: 'Alış Faturaları',
  },
  icon: 'PackagePlus',
  header: {
    // Distinct numbering series so purchase and sales invoices don't collide
    // on a shared INVOICE-0000xx sequence (QA #25). docNumber maps to the
    // existing top-level `number` column — no schema change.
    number: field.docNumber({
      label: { en: 'No.', ru: '№', tr: 'No' },
      prefix: 'PI-',
      formHidden: true,
    }),
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
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закреплённый закупщик', tr: 'Atanan Alıcı' },
      formHidden: true,
    }),
    supplierDocNo: field.string({
      label: {
        en: "Supplier's Doc No",
        ru: 'Номер документа поставщика',
        tr: 'Tedarikçi belge no',
      },
    }),
    paymentTerms: field.string({
      label: { en: 'Payment Terms', ru: 'Условия оплаты', tr: 'Ödeme vadesi' },
      enumValues: ['cash', '30d', '45d', '60d'],
      enumLabels: {
        cash: { en: 'Cash', ru: 'Наличные', tr: 'Peşin' },
        '30d': { en: '30 days', ru: '30 дней', tr: '30 gün' },
        '45d': { en: '45 days', ru: '45 дней', tr: '45 gün' },
        '60d': { en: '60 days', ru: '60 дней', tr: '60 gün' },
      },
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
    'inventory.stock_balance': async (doc) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantity: number;
        price: number;
      }>;
      const warehouse = doc.warehouse as string;
      const date = (doc.date as Date) ?? new Date();

      const rows: Movement[] = [];
      for (const l of items) {
        const qty = Number(l.quantity ?? 0);
        const price = Number(l.price ?? 0);
        const lineTotal = qty * price;
        rows.push({
          kind: 'income' as const,
          timestamp: date,
          warehouse,
          product: l.product,
          quantity: qty,
          totalCost: lineTotal,
        });
      }
      return rows;
    },
    'purchases.accounts_payable': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        quantity: number;
        price: number;
      }>;
      const subtotal = items.reduce(
        (acc, l) => acc + Number(l.quantity ?? 0) * Number(l.price ?? 0),
        0,
      );
      if (!Number.isFinite(subtotal) || subtotal === 0) return [];
      // We owe the supplier the GROSS (subtotal + VAT) when tax is enabled.
      const tax = await resolveTaxSettings(ctx.tx as Prisma.TransactionClient);
      const vat = computeVat(subtotal, tax);
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'income' as const,
          timestamp: date,
          supplier: doc.supplier as string,
          amount: Math.round((subtotal + vat) * 100) / 100,
        },
      ];
    },
    // INPUT VAT paid on this purchase (kind='expense' = reclaimable, reduces the
    // net VAT owed). Empty when tax is disabled — see platform/engine/tax.ts.
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
          kind: 'expense' as const,
          timestamp: date,
          counterparty: doc.supplier as string,
          amount: vat,
        },
      ];
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'supplier',
  rowActions: [
    {
      key: 'recordPayment',
      target: 'purchases.payment_sent',
      icon: 'HandCoins',
      label: {
        en: 'Record payment',
        ru: 'Создать оплату',
        tr: 'Ödeme yap',
      },
      visibleWhen: {
        status: 'POSTED',
        openBalance: { register: 'purchases.accounts_payable' },
      },
      map: {
        supplier: { source: 'self.field', field: 'supplier' },
        supplierName: { source: 'refLabel', field: 'supplier' },
        invoice: { source: 'self.id' },
        invoiceNumber: { source: 'self.field', field: 'number' },
        amount: { source: 'openBalance.original' },
      },
    },
  ],
});
