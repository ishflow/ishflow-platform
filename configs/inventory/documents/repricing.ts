import { defineDocument, field } from '@/platform/metadata';

/**
 * `inventory.repricing` — Переоценка ТМЦ / Inventory Repricing.
 *
 * Inventory revaluation document. Per line: oldCost (current carrying
 * cost per unit) → newCost (revalued cost per unit). The delta is the
 * accounting impact; this document tracks the audit trail (who/when/why)
 * and the matrix of changes.
 *
 * Carries NO register movements — pure audit/operational record. The
 * actual cost-basis update lands via a sibling posting flow (today the
 * cost basis is recomputed elsewhere; this doc is the paper trail).
 *
 * Each line carries money (old/new cost) in the tenant's operational
 * currency.
 */
defineDocument({
  module: 'inventory',
  name: 'repricing',
  label: { en: 'Inventory Repricing', ru: 'Переоценка ТМЦ', tr: 'Stok Yeniden Değerleme' },
  pluralLabel: {
    en: 'Inventory Repricings',
    ru: 'Переоценки ТМЦ',
    tr: 'Stok Yeniden Değerlemeleri',
  },
  icon: 'TrendingUp',
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
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
    }),
    approvedBy: field.string({
      label: { en: 'Approved By', ru: 'Утвердил', tr: 'Onaylayan' },
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
        oldCost: field.money({
          label: { en: 'Old Cost', ru: 'Старая цена', tr: 'Eski Maliyet' },
          required: true,
        }),
        newCost: field.money({
          label: { en: 'New Cost', ru: 'Новая цена', tr: 'Yeni Maliyet' },
          required: true,
        }),
      },
    },
  },
  // Audit trail — no register movements.
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'warehouse',
});
