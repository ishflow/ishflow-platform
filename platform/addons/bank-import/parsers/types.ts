/**
 * Common types for bank statement parsers.
 *
 * Each format ships a parser that takes a `Buffer` (raw uploaded file bytes)
 * and returns a flat list of `ParsedRow`. Direction is always normalised so
 * that `amount` is positive, and `direction` says which way the money went
 * from the tenant's perspective.
 */

export type BankStatementFormat = '1c_bank_v102' | 'sber_csv' | 'tinkoff_csv' | 'kaspi_csv';

export const BANK_STATEMENT_FORMATS: readonly BankStatementFormat[] = [
  '1c_bank_v102',
  'sber_csv',
  'tinkoff_csv',
  'kaspi_csv',
] as const;

export type ParsedRow = {
  /** Value (settlement) date of the transaction. */
  valueDate: Date;
  /** Money flow direction from the tenant's perspective. `in` = received, `out` = sent. */
  direction: 'in' | 'out';
  /** Absolute amount, always positive, two-decimal precision. */
  amount: number;
  /** ISO-4217 currency code (best-effort: parsers default to RUB or KZT). */
  currency: string;
  /** Counterparty business name, raw from the statement. May be null. */
  counterpartyName: string | null;
  /** Counterparty bank account number string. May be null. */
  counterpartyAccount: string | null;
  /** Counterparty INN/BIN (tax number). May be null. */
  counterpartyInn: string | null;
  /** Free-text narrative / payment purpose. May be null. */
  narrative: string | null;
  /**
   * Bank-issued unique id for the row, when available. Parsers MUST set this
   * to a stable value derived from the row content (date + amount + narrative
   * hash) when the bank provides no native id — so re-imports detect dupes.
   */
  externalId: string | null;
};

export interface ParseBufferOptions {
  /** Override automatic encoding detection. Used by tests. */
  encoding?: string;
}

export type ParseBuffer = (buf: Buffer, opts?: ParseBufferOptions) => ParsedRow[];
