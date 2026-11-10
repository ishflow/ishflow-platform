import { defineDocument, field } from '@/platform/metadata';
// Side-effect import: service_receipt posts to purchases.accounts_payable, so
// any test/runtime path that imports this doc must have the register registered too.
import '@/configs/purchases/registers/accounts-payable';
// Side-effect: posts INPUT VAT to finance.vat when tax is enabled.
import '@/configs/finance/registers/vat';
import { computeVat, resolveTaxSettings } from '@/platform/engine/tax';
import type { Prisma } from '@prisma/client';

/**
 * `purchases.service_receipt` — Поступление услуг / Service receipt.
 *
 * Mirror of `sales.service_sale`: 1C-style "services-only" purchase
 * document. No warehouse, no product, no stock movements — services
 * aren't inventoried. Posting writes a single `kind: 'income'` row to
 * `purchases.accounts_payable` (incoming = supplier debt increase).
 */
defineDocument({
  module: 'purchases',
  name: 'service_receipt',
  label: { en: 'Service Receipt', ru: 'Поступление услуг', tr: 'Hizmet Alımı' },
  pluralLabel: {
    en: 'Service Receipts',
    ru: 'Поступления услуг',
    tr: 'Hizmet Alımları',
  },
  icon: 'HandCoins',
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
    supplierDocNo: field.string({
      label: {
        en: 'Supplier doc №',
        ru: '№ документа поставщика',
        tr: 'Tedarikçi belge №',
      },
      maxLength: 64,
    }),
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закупщик', tr: 'Alıcı' },
      formHidden: true,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {
    items: {
      label: { en: 'Service', ru: 'Услуга', tr: 'Hizmet' },
      pluralLabel: { en: 'Services', ru: 'Услуги', tr: 'Hizmetler' },
      minRows: 1,
      fields: {
        description: field.string({
          label: { en: 'Description', ru: 'Описание', tr: 'Açıklama' },
          required: true,
          maxLength: 256,
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
    'purchases.accounts_payable': async (doc, ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        quantity: number;
        price: number;
      }>;
      const total = items.reduce((a, l) => a + Number(l.quantity ?? 0) * Number(l.price ?? 0), 0);
      if (!Number.isFinite(total) || total === 0) return [];
      // We owe the supplier the GROSS (subtotal + VAT) when tax is enabled.
      const tax = await resolveTaxSettings(ctx.tx as Prisma.TransactionClient);
      const vat = computeVat(total, tax);
      const date = (doc.date as Date) ?? new Date();
      return [
        {
          kind: 'income' as const, // supplier debt increase
          timestamp: date,
          supplier: doc.supplier as string,
          amount: Math.round((total + vat) * 100) / 100,
        },
      ];
    },
    // INPUT VAT paid on this service receipt (kind='expense' = reclaimable).
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
});
