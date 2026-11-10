import { defineDocument, field } from '@/platform/metadata';

/**
 * `sales.commercial_offer` — Коммерческое предложение / Commercial
 * Offer (sales proposal).
 *
 * A proposal sent to a prospect / customer listing items + prices with a
 * validity window. NOT a tax document, NOT a register-posting document
 * — it's a status-only sales artifact. If the customer accepts, the
 * proposal converts into a sibling `sales.order` / `sales.invoice` that
 * carries the actual stock + AR movements.
 *
 * Lines `items`: product is OPTIONAL (proposals often pitch
 * not-yet-catalogued or bespoke items via free-form description).
 */
defineDocument({
  module: 'sales',
  name: 'commercial_offer',
  label: { en: 'Commercial Offer', ru: 'Коммерческое предложение', tr: 'Teklif' },
  pluralLabel: {
    en: 'Commercial Offers',
    ru: 'Коммерческие предложения',
    tr: 'Teklifler',
  },
  icon: 'FileText',
  header: {
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
    validUntil: field.date({
      label: { en: 'Valid Until', ru: 'Действительно до', tr: 'Geçerlilik Tarihi' },
    }),
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
    }),
    assignedRepId: field.string({
      label: { en: 'Assigned Rep', ru: 'Менеджер', tr: 'Atanan Temsilci' },
      formHidden: true,
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
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
        description: field.string({
          label: { en: 'Description', ru: 'Описание', tr: 'Açıklama' },
          maxLength: 256,
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
  // Sales proposal — no register movements.
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'customer',
});
