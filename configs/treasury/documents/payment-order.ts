import { defineDocument, field } from '@/platform/metadata';

/**
 * `treasury.payment_order` — Платёжное поручение / Payment Order.
 *
 * A formal bank payment order: the document the company sends to its
 * bank to pay a counterparty. Captures the legal recipient details
 * (account / BIC / INN) and the payment purpose required by Russian
 * banking regulation.
 *
 * Single-document — no lines. Carries NO register movements; this is
 * the *instruction* to the bank, not the bank statement. The matching
 * `purchases.bank_payment` (executed by the bank) is what actually
 * moves money on `treasury.bank_funds` + closes A/P.
 *
 * `linkedRequest` is an optional back-reference to the originating
 * `purchases.payment_request` (kept as a free-form string, not a hard
 * FK — Russian payment orders frequently quote external request IDs).
 */
defineDocument({
  module: 'treasury',
  name: 'payment_order',
  label: { en: 'Payment Order', ru: 'Платёжное поручение', tr: 'Ödeme Emri' },
  pluralLabel: {
    en: 'Payment Orders',
    ru: 'Платёжные поручения',
    tr: 'Ödeme Emirleri',
  },
  icon: 'Send',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    bankAccount: field.reference({
      label: { en: 'Bank Account', ru: 'Банковский счёт', tr: 'Banka Hesabı' },
      required: true,
      to: { kind: 'ref', module: 'treasury', name: 'bank_account' },
    }),
    recipientName: field.string({
      label: { en: 'Recipient Name', ru: 'Получатель', tr: 'Alıcı Adı' },
      required: true,
      maxLength: 256,
    }),
    recipientAccountNo: field.string({
      label: { en: 'Recipient Account No.', ru: 'Счёт получателя', tr: 'Alıcı Hesap No' },
      maxLength: 64,
    }),
    recipientBic: field.string({
      label: { en: 'Recipient BIC', ru: 'БИК получателя', tr: 'Alıcı BIC' },
      maxLength: 32,
    }),
    recipientInn: field.string({
      label: { en: 'Recipient INN', ru: 'ИНН получателя', tr: 'Alıcı VKN' },
      maxLength: 32,
    }),
    amount: field.money({
      label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
      required: true,
    }),
    purpose: field.string({
      label: { en: 'Purpose', ru: 'Назначение платежа', tr: 'Ödeme Amacı' },
      maxLength: 512,
    }),
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
    }),
    linkedRequest: field.string({
      label: { en: 'Linked Request', ru: 'Заявка-основание', tr: 'Bağlı Talep' },
      formHidden: true,
      maxLength: 64,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  lines: {},
  // Instruction-to-bank — no register movements.
  posting: {},
  permissions: {
    read: 'any',
  },
  displayField: 'recipientName',
});
