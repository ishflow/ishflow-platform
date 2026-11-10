import { defineDocument, field } from '@/platform/metadata';
// Side-effect imports: debt_adjustment can post to AR and/or AP, so any
// test/runtime path that imports this doc must have both registers loaded.
import '@/configs/sales/registers/accounts-receivable';
import '@/configs/purchases/registers/accounts-payable';

/**
 * `treasury.debt_adjustment` — Корректировка долга / Debt Adjustment.
 *
 * Three operational kinds:
 *   - `netting` (взаимозачёт) — close mutual debt between a customer
 *     who is also a supplier (or vice versa). Phase 2 V1 supports the
 *     simple "close my receivable" or "close my payable" half; the full
 *     two-sided netting wiring (when the same legal entity holds both
 *     a customer + supplier role) lands in a follow-up.
 *   - `writeoff` (списание) — write off an uncollectable receivable or
 *     forgiven payable. Posting inverts the open balance.
 *   - `transfer` (перенос) — move debt from one counterparty to another
 *     (factoring, M&A, etc). Phase 2 V1 emits only the FROM half; the
 *     TO half is deferred.
 *
 * Counterparty is held as a polymorphic string id paired with
 * `counterpartyKind` (customer | supplier) so the same document type
 * supports both AR and AP closures without two separate doc types.
 *
 * Posting strategy: for the FROM counterparty, emit an inverse movement
 * (`kind: 'expense'` with the original amount) so the open balance on
 * the related document is reduced. For `transfer`, the TO half is not
 * yet emitted (Phase 2 follow-up).
 */
defineDocument({
  module: 'treasury',
  name: 'debt_adjustment',
  label: { en: 'Debt Adjustment', ru: 'Корректировка долга', tr: 'Borç Düzeltme' },
  pluralLabel: {
    en: 'Debt Adjustments',
    ru: 'Корректировки долга',
    tr: 'Borç Düzeltmeleri',
  },
  icon: 'Scale',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    kind: field.string({
      label: { en: 'Kind', ru: 'Вид операции', tr: 'İşlem Türü' },
      required: true,
      maxLength: 16,
      enumValues: ['netting', 'writeoff', 'transfer'],
      enumLabels: {
        netting: { en: 'Netting', ru: 'Взаимозачёт', tr: 'Mahsup' },
        writeoff: { en: 'Write-off', ru: 'Списание', tr: 'Silme' },
        transfer: { en: 'Transfer', ru: 'Перенос', tr: 'Devir' },
      },
    }),
    counterpartyKind: field.string({
      label: { en: 'Counterparty Kind', ru: 'Тип контрагента', tr: 'Karşı Taraf Türü' },
      required: true,
      maxLength: 16,
      enumValues: ['customer', 'supplier'],
      enumLabels: {
        customer: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' },
        supplier: { en: 'Supplier', ru: 'Поставщик', tr: 'Tedarikçi' },
      },
    }),
    counterparty: field.string({
      label: { en: 'Counterparty', ru: 'Контрагент', tr: 'Karşı Taraf' },
      required: true,
      maxLength: 64,
    }),
    counterpartyToKind: field.string({
      label: {
        en: 'Transfer To (Kind)',
        ru: 'Перенести на (тип)',
        tr: 'Devir Edilecek (Tür)',
      },
      maxLength: 16,
    }),
    counterpartyTo: field.string({
      label: { en: 'Transfer To', ru: 'Перенести на', tr: 'Devir Edilecek' },
      maxLength: 64,
    }),
    reason: field.text({
      label: { en: 'Reason', ru: 'Основание', tr: 'Sebep' },
    }),
  },
  lines: {
    items: {
      label: { en: 'Line', ru: 'Строка', tr: 'Satır' },
      pluralLabel: { en: 'Lines', ru: 'Строки', tr: 'Satırlar' },
      minRows: 1,
      fields: {
        originalDocRef: field.string({
          label: { en: 'Original Doc Ref', ru: 'Документ-основание', tr: 'Orijinal Belge Ref' },
          required: true,
          maxLength: 64,
        }),
        originalDocType: field.string({
          label: { en: 'Original Doc Type', ru: 'Тип документа', tr: 'Orijinal Belge Türü' },
          required: true,
          maxLength: 64,
        }),
        amount: field.money({
          label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
          required: true,
        }),
      },
    },
  },
  posting: {
    'sales.accounts_receivable': async (doc) => {
      if (doc.counterpartyKind !== 'customer') return [];
      const items = (doc.lines?.items ?? []) as Array<{
        originalDocRef: string;
        originalDocType: string;
        amount: number;
      }>;
      if (items.length === 0) return [];
      const date = (doc.date as Date) ?? new Date();
      return items.map((l) => ({
        // 'expense' on accounts_receivable closes (decreases) the
        // outstanding balance — same convention as payment-received.
        kind: 'expense' as const,
        timestamp: date,
        customer: doc.counterparty as string,
        relatedDocRef: l.originalDocRef,
        amount: Number(l.amount ?? 0),
      }));
    },
    'purchases.accounts_payable': async (doc) => {
      if (doc.counterpartyKind !== 'supplier') return [];
      const items = (doc.lines?.items ?? []) as Array<{
        originalDocRef: string;
        originalDocType: string;
        amount: number;
      }>;
      if (items.length === 0) return [];
      const date = (doc.date as Date) ?? new Date();
      return items.map((l) => ({
        // 'expense' on accounts_payable closes (decreases) the
        // outstanding balance — same convention as payment-sent.
        kind: 'expense' as const,
        timestamp: date,
        supplier: doc.counterparty as string,
        relatedDocRef: l.originalDocRef,
        amount: Number(l.amount ?? 0),
      }));
    },
  },
  permissions: {
    read: 'any',
  },
  displayField: 'date',
});
