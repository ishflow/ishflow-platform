import { defineDocument, field } from '@/platform/metadata';

/**
 * `purchases.receipt_act` — Акт приёмки / Receipt Act.
 *
 * Formal goods-receipt acceptance document. Records what the supplier sent
 * (expected qty per the invoice / PO) vs what was actually accepted into
 * the warehouse, plus any per-line discrepancy note. Issued by the
 * inspector physically receiving the goods.
 *
 * Carries NO register movements — this is an operational / audit-trail
 * record only. Stock arrives via the linked purchases.invoice posting;
 * the receipt act documents the inspection event and any deltas, which
 * downstream processes (claims, returns, write-offs) can act on.
 *
 * Quantities only, no money.
 */
defineDocument({
  module: 'purchases',
  name: 'receipt_act',
  label: { en: 'Receipt Act', ru: 'Акт приёмки', tr: 'Mal Kabul Tutanağı' },
  pluralLabel: {
    en: 'Receipt Acts',
    ru: 'Акты приёмки',
    tr: 'Mal Kabul Tutanakları',
  },
  icon: 'ClipboardCheck',
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
    linkedInvoice: field.string({
      label: { en: 'Linked Invoice', ru: 'Связанный счёт', tr: 'Bağlı Fatura' },
      maxLength: 64,
    }),
    inspectorName: field.string({
      label: { en: 'Inspector', ru: 'Приёмщик', tr: 'Mal Kabul Görevlisi' },
    }),
    acceptanceNotes: field.text({
      label: { en: 'Acceptance Notes', ru: 'Замечания приёмки', tr: 'Kabul Notları' },
    }),
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
    }),
    assignedBuyerId: field.string({
      label: { en: 'Assigned Buyer', ru: 'Закупщик', tr: 'Atanan Alıcı' },
      formHidden: true,
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
        expectedQty: field.number({
          label: { en: 'Expected Qty', ru: 'Ожидаемое количество', tr: 'Beklenen Miktar' },
          required: true,
          min: 0,
        }),
        acceptedQty: field.number({
          label: { en: 'Accepted Qty', ru: 'Принятое количество', tr: 'Kabul Edilen Miktar' },
          required: true,
          min: 0,
        }),
        discrepancyNote: field.string({
          label: { en: 'Discrepancy Note', ru: 'Замечание по расхождению', tr: 'Fark Notu' },
          maxLength: 256,
        }),
      },
    },
  },
  // Inspection / audit record — no register movements.
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'supplier',
});
