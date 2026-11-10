import { defineDocument, field } from '@/platform/metadata';
// Side-effect import: sales.order posts to the reserved_stock register, so
// any test/runtime path that imports this doc must have the register
// registered too.
import '@/configs/sales/registers/reserved-stock';

/**
 * `sales.order` — Заказ покупателя / Customer Sales Order.
 *
 * The customer commitment document that earmarks warehouse stock for a
 * specific customer until the matching sales invoice ships. Posting
 * writes `kind: 'income'` rows to `sales.reserved_stock` (one per line)
 * keyed by (warehouse, product, customer). When the linked sales invoice
 * posts, it inverts the reservation via the standard register reversal
 * flow on cancellation, or via a future `releaseReservation` mapper.
 */
defineDocument({
  module: 'sales',
  name: 'order',
  label: { en: 'Sales Order', ru: 'Заказ покупателя', tr: 'Satış Siparişi' },
  pluralLabel: {
    en: 'Sales Orders',
    ru: 'Заказы покупателей',
    tr: 'Satış Siparişleri',
  },
  icon: 'ShoppingCart',
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
    expectedDate: field.datetime({
      label: { en: 'Expected Date', ru: 'Дата отгрузки', tr: 'Beklenen Tarih' },
    }),
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
      // Default 'open' is applied by the create action / consumers when
      // unset — field.string doesn't carry a `default` in the current DSL.
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
        price: field.money({
          label: { en: 'Price', ru: 'Цена', tr: 'Fiyat' },
          required: true,
        }),
      },
    },
  },
  posting: {
    'sales.reserved_stock': async (doc, _ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantity: number;
      }>;
      const warehouse = doc.warehouse as string;
      const customer = doc.customer as string;
      const date = (doc.date as Date) ?? new Date();
      return items.map((l) => ({
        kind: 'income' as const,
        timestamp: date,
        warehouse,
        product: l.product,
        customer,
        quantity: Number(l.quantity ?? 0),
      }));
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'customer',
});
