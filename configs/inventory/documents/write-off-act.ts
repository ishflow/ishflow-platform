import { defineDocument, field } from '@/platform/metadata';

/**
 * `inventory.write_off_act` — Акт на списание / Write-off Act.
 *
 * Formal write-off document signed by a commission. Records the reason
 * code (damage / loss / expired / internal use / other), the textual
 * reason narrative, the commission members (stored as a JSON array in a
 * text field — list rendering is downstream), and the approver name.
 *
 * Carries NO register movements — operational / audit-trail only. The
 * actual stock decrement is performed by a sibling
 * `inventory.stock_adjustment` (negative direction). The write-off act
 * documents WHY the adjustment happened and who signed off.
 *
 * Single-currency: quantities only, no money.
 */
defineDocument({
  module: 'inventory',
  name: 'write_off_act',
  label: { en: 'Write-off Act', ru: 'Акт на списание', tr: 'Silme Tutanağı' },
  pluralLabel: {
    en: 'Write-off Acts',
    ru: 'Акты на списание',
    tr: 'Silme Tutanakları',
  },
  icon: 'FileMinus',
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
    reasonCode: field.string({
      label: { en: 'Reason Code', ru: 'Код причины', tr: 'Sebep Kodu' },
      maxLength: 32,
      enumValues: ['damage', 'loss', 'expired', 'internal_use', 'other'],
    }),
    reason: field.text({
      label: { en: 'Reason', ru: 'Причина', tr: 'Sebep' },
    }),
    commissionMembers: field.text({
      label: { en: 'Commission Members', ru: 'Члены комиссии', tr: 'Komisyon Üyeleri' },
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
        quantity: field.number({
          label: { en: 'Quantity', ru: 'Количество', tr: 'Miktar' },
          required: true,
          min: 1,
        }),
      },
    },
  },
  // Commission write-off record — no register movements (paired stock_adjustment posts).
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'warehouse',
});
