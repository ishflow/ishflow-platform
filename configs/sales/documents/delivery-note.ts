import { defineDocument, field } from '@/platform/metadata';

/**
 * `sales.delivery_note` — Расходная накладная / Delivery Note.
 *
 * Shipping document separate from the sales invoice. Lists the products
 * physically handed over to the customer (or to a courier), plus driver +
 * vehicle metadata for the paper trail. Often the same accounting event
 * settles via a sibling `sales.invoice`; the delivery note carries the
 * `linkedInvoice` UUID (stored as plain string) so reconciliation can
 * follow the chain.
 *
 * Carries NO register movements — this is an operational / audit-trail
 * record. Stock leaves via the linked sales.invoice posting; the delivery
 * note itself only documents the physical handover.
 *
 * Single-currency: a delivery note carries quantities only, never money.
 */
defineDocument({
  module: 'sales',
  name: 'delivery_note',
  label: { en: 'Delivery Note', ru: 'Расходная накладная', tr: 'İrsaliye' },
  pluralLabel: {
    en: 'Delivery Notes',
    ru: 'Расходные накладные',
    tr: 'İrsaliyeler',
  },
  icon: 'Truck',
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
    warehouse: field.reference({
      label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    linkedInvoice: field.string({
      label: { en: 'Linked Invoice', ru: 'Связанный счёт', tr: 'Bağlı Fatura' },
      maxLength: 64,
    }),
    driverName: field.string({
      label: { en: 'Driver Name', ru: 'Водитель', tr: 'Sürücü Adı' },
    }),
    vehiclePlate: field.string({
      label: { en: 'Vehicle Plate', ru: 'Номер ТС', tr: 'Plaka' },
      maxLength: 32,
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
  // Operational handover record — no register movements.
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'customer',
});
