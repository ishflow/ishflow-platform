import { defineDocument, field } from '@/platform/metadata';
// Side-effect import: purchases.order posts to the expected_stock register,
// so any test/runtime path that imports this doc must have the register
// registered too.
import '@/configs/purchases/registers/expected-stock';

/**
 * `purchases.order` — Заказ поставщику / Purchase Order.
 *
 * The supplier commitment document that records how much of each product
 * is on order from a supplier and expected to land in a specific
 * warehouse. Posting writes `kind: 'income'` rows to
 * `purchases.expected_stock` (one per line) keyed by
 * (warehouse, product, supplier). When the linked purchase invoice posts,
 * it closes the expectation via the standard register reversal flow on
 * cancellation, or via a future `closeExpectation` mapper.
 */
defineDocument({
  module: 'purchases',
  name: 'order',
  label: { en: 'Purchase Order', ru: 'Заказ поставщику', tr: 'Alış Siparişi' },
  pluralLabel: {
    en: 'Purchase Orders',
    ru: 'Заказы поставщикам',
    tr: 'Alış Siparişleri',
  },
  icon: 'ClipboardList',
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
    warehouse: field.reference({
      label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
    }),
    expectedDate: field.datetime({
      label: { en: 'Expected Date', ru: 'Дата поступления', tr: 'Beklenen Tarih' },
    }),
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
      // Default 'open' is applied by the create action / consumers when
      // unset — field.string doesn't carry a `default` in the current DSL.
    }),
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закупщик', tr: 'Atanan Alıcı' },
      formHidden: true,
    }),
    supplierDocNo: field.string({
      label: {
        en: "Supplier's Doc No",
        ru: 'Номер документа поставщика',
        tr: 'Tedarikçi belge no',
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
    'purchases.expected_stock': async (doc, _ctx) => {
      const items = (doc.lines?.items ?? []) as Array<{
        product: string;
        quantity: number;
      }>;
      const warehouse = doc.warehouse as string;
      const supplier = doc.supplier as string;
      const date = (doc.date as Date) ?? new Date();
      return items.map((l) => ({
        kind: 'income' as const,
        timestamp: date,
        warehouse,
        product: l.product,
        supplier,
        quantity: Number(l.quantity ?? 0),
      }));
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'supplier',
});
