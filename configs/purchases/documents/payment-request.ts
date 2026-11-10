import { defineDocument, field } from '@/platform/metadata';

/**
 * `purchases.payment_request` — Заявка на оплату / Payment Request.
 *
 * Pre-approval workflow document. The buyer (or whoever needs cash to
 * leave the company) raises a request; an approver flips
 * `workflowStatus` to approved; finance then issues a sibling
 * `treasury.payment_order` that quotes back to this request.
 *
 * Single-document — no lines; the header carries a single amount.
 * Carries NO register movements — this is an audit-trail / approval
 * record only. Once approved, the actual cash movement happens via the
 * payment_order → bank_payment chain.
 */
defineDocument({
  module: 'purchases',
  name: 'payment_request',
  label: { en: 'Payment Request', ru: 'Заявка на оплату', tr: 'Ödeme Talebi' },
  pluralLabel: {
    en: 'Payment Requests',
    ru: 'Заявки на оплату',
    tr: 'Ödeme Talepleri',
  },
  icon: 'FileQuestion',
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
    amount: field.money({
      label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
      required: true,
    }),
    dueDate: field.date({
      label: { en: 'Due Date', ru: 'Срок оплаты', tr: 'Vade Tarihi' },
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
    approvedBy: field.string({
      label: { en: 'Approved By', ru: 'Утвердил', tr: 'Onaylayan' },
      formHidden: true,
      maxLength: 128,
    }),
    approvedAt: field.datetime({
      label: { en: 'Approved At', ru: 'Дата утверждения', tr: 'Onay Tarihi' },
      formHidden: true,
    }),
    reason: field.string({
      label: { en: 'Reason', ru: 'Обоснование', tr: 'Sebep' },
      maxLength: 256,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {},
  // Pre-approval record — no register movements.
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'supplier',
});
