/**
 * Public dispatch for the four bank statement formats.
 *
 * Callers (the import-statement workflow) supply a chosen format + a Buffer
 * holding the raw bytes; we route to the format-specific parser and return a
 * normalised `ParsedRow[]`.
 */

import { parse1cBankV102 } from './1c-bank-v102';
import { parseKaspiCsv } from './kaspi-csv';
import { parseSberCsv } from './sber-csv';
import { parseTinkoffCsv } from './tinkoff-csv';
import type { BankStatementFormat, ParseBufferOptions, ParsedRow } from './types';

export {
  BANK_STATEMENT_FORMATS,
  type BankStatementFormat,
  type ParseBufferOptions,
  type ParsedRow,
} from './types';
export { parse1cBankV102 } from './1c-bank-v102';
export { parseSberCsv } from './sber-csv';
export { parseTinkoffCsv } from './tinkoff-csv';
export { parseKaspiCsv } from './kaspi-csv';

export function parseStatement(
  format: BankStatementFormat,
  buf: Buffer,
  opts?: ParseBufferOptions,
): ParsedRow[] {
  switch (format) {
    case '1c_bank_v102':
      return parse1cBankV102(buf, opts);
    case 'sber_csv':
      return parseSberCsv(buf, opts);
    case 'tinkoff_csv':
      return parseTinkoffCsv(buf, opts);
    case 'kaspi_csv':
      return parseKaspiCsv(buf, opts);
    default: {
      const exhaustive: never = format;
      throw new Error(`parseStatement: unknown format "${exhaustive}"`);
    }
  }
}
