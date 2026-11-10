import { defineDocument, field } from '@/platform/metadata';

/**
 * `inventory.material_request` — Заявка на материалы / Material Request.
 *
 * Internal request for materials / stock to be allocated to a warehouse
 * (e.g. shop-floor asks for raw materials, branch asks for replenish).
 * NOT multi-currency — quantities only, no money. Carries NO register
 * movements; this is an approval / planning artifact. Fulfilment
 * happens via a sibling `inventory.stock_transfer` or
 * `inventory.assembly` that actually moves stock.
 */
defineDocument({
  module: 'inventory',
  name: 'material_request',
  label: { en: 'Material Request', ru: 'Заявка на материалы', tr: 'Malzeme Talebi' },
  pluralLabel: {
    en: 'Material Requests',
    ru: 'Заявки на материалы',
    tr: 'Malzeme Talepleri',
  },
  icon: 'ClipboardList',
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
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
    }),
    requestedBy: field.string({
      label: { en: 'Requested By', ru: 'Инициатор', tr: 'Talep Eden' },
      maxLength: 128,
    }),
    reason: field.string({
      label: { en: 'Reason', ru: 'Обоснование', tr: 'Sebep' },
      maxLength: 256,
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
      },
    },
  },
  // Internal planning record — no register movements.
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'warehouse',
});
