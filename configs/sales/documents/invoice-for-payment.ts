import { defineDocument, field } from '@/platform/metadata';

/**
 * `sales.invoice_for_payment` — Счёт на оплату / Proforma invoice (request
 * for payment).
 *
 * A pre-payment proforma. NOT a tax invoice and NOT a register-posting
 * document — it carries no movements on its own, just status. Once the
 * payment lands, the customer typically ships against a sibling
 * `sales.invoice` (which posts AR + revenue) and the proforma is closed.
 *
 * `linkedSalesOrder` is an optional back-reference to the sales order
 * this proforma was generated from.
 */
defineDocument({
  module: 'sales',
  name: 'invoice_for_payment',
  label: { en: 'Invoice for Payment', ru: 'Счёт на оплату', tr: 'Ödeme Faturası' },
  pluralLabel: {
    en: 'Invoices for Payment',
    ru: 'Счета на оплату',
    tr: 'Ödeme Faturaları',
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
    dueDate: field.datetime({
      label: { en: 'Due Date', ru: 'Срок оплаты', tr: 'Son Ödeme Tarihi' },
    }),
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
      // Default 'issued' is applied by the create action / consumers when
      // unset — field.string doesn't carry a `default` in the current DSL.
    }),
    assignedRepId: field.string({
      label: { en: 'Assigned Rep', ru: 'Менеджер', tr: 'Atanan Temsilci' },
      formHidden: true,
    }),
    linkedSalesOrder: field.reference({
      label: { en: 'Linked Sales Order', ru: 'Заказ-основание', tr: 'Bağlı Satış Siparişi' },
      to: { kind: 'ref', module: 'sales', name: 'order' },
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
        // Proformas can carry free-form services / not-yet-catalogued items
        // → product is OPTIONAL. When set, downstream forms can auto-fill
        // description from product.name.
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
  // Proforma writes nothing — status-only document.
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'customer',
});
