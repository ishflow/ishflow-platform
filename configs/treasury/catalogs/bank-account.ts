import { defineCatalog, field } from '@/platform/metadata';

/**
 * `treasury.bank_account` — Банковский счёт / Bank Account.
 *
 * Mirror of the existing `BankAccount` Prisma model (table
 * `bank_account`). The model predates the metadata engine and has no
 * `deletedAt` column, so this catalog does not support soft-delete; the
 * engine's standard archive flow will fail on this entity until a
 * migration adds the column. Required fields match the Prisma `NOT NULL`
 * columns (`name`, `accountNo`).
 */
defineCatalog({
  module: 'treasury',
  name: 'bank_account',
  label: { en: 'Bank Account', ru: 'Банковский счёт', tr: 'Banka Hesabı' },
  pluralLabel: { en: 'Bank Accounts', ru: 'Банковские счета', tr: 'Banka Hesapları' },
  icon: 'Landmark',
  fields: {
    name: field.string({
      label: { en: 'Name', ru: 'Наименование', tr: 'Ad' },
      required: true,
      maxLength: 128,
    }),
    bankName: field.string({
      label: { en: 'Bank', ru: 'Банк', tr: 'Banka' },
      maxLength: 128,
    }),
    accountNo: field.string({
      label: { en: 'Account No', ru: '№ счёта', tr: 'Hesap No' },
      required: true,
      maxLength: 64,
    }),
    bic: field.string({
      label: { en: 'BIC', ru: 'БИК', tr: 'BIC' },
      maxLength: 32,
    }),
  },
  displayField: 'name',
  permissions: {
    read: 'any',
  },
});
