/**
 * Kaspi Business (Kazakhstan) CSV statement parser.
 *
 * Kaspi Business currently exports `,`-delimited UTF-8 CSV with English /
 * Russian hybrid headers, default currency KZT. Columns we care about:
 *
 *   Date, Amount, Counterparty, Counterparty BIN, Description, Direction
 *
 * `Direction` is sometimes explicit (`incoming`/`outgoing` or
 * `income`/`expense`); other exports rely on the sign of `Amount`. We accept
 * both.
 */

import { deriveExternalId } from '../normalize';
import { findColumn, parseCsvBuffer, parseFlexibleDate, parseRusAmount } from './csv-util';
import type { ParseBufferOptions, ParsedRow } from './types';

const HEADERS = {
  number: ['Operation ID', 'ID', 'Document', '№', 'Document No'],
  date: ['Date', 'Operation Date', 'Дата', 'Posting Date'],
  amount: ['Amount', 'Сумма'],
  currency: ['Currency', 'Валюта'],
  direction: ['Direction', 'Type', 'Operation Type', 'Направление'],
  counterparty: ['Counterparty', 'Контрагент', 'Counterparty Name'],
  account: ['Counterparty Account', 'IBAN', 'Account', 'Счёт', 'Счет'],
  bin: ['Counterparty BIN', 'BIN', 'ИНН', 'BIN/IIN'],
  narrative: ['Description', 'Purpose', 'Назначение', 'Comment'],
} as const;

function inferDirection(explicit: string | null | undefined, signedAmount: number): 'in' | 'out' {
  if (explicit) {
    const v = explicit.toLowerCase();
    if (v.startsWith('inc') || v === 'in' || v === 'credit' || v.startsWith('зачис')) {
      return 'in';
    }
    if (v.startsWith('out') || v === 'expense' || v === 'debit' || v.startsWith('списан')) {
      return 'out';
    }
  }
  return signedAmount < 0 ? 'out' : 'in';
}

export function parseKaspiCsv(buf: Buffer, opts?: ParseBufferOptions): ParsedRow[] {
  const { rows } = parseCsvBuffer(buf, opts);
  const probe = rows[0];
  if (!probe) return [];

  const numberCol = findColumn(probe, HEADERS.number);
  const dateCol = findColumn(probe, HEADERS.date);
  const amountCol = findColumn(probe, HEADERS.amount);
  const currencyCol = findColumn(probe, HEADERS.currency);
  const directionCol = findColumn(probe, HEADERS.direction);
  const counterpartyCol = findColumn(probe, HEADERS.counterparty);
  const accountCol = findColumn(probe, HEADERS.account);
  const binCol = findColumn(probe, HEADERS.bin);
  const narrativeCol = findColumn(probe, HEADERS.narrative);

  if (!dateCol || !amountCol) return [];

  const out: ParsedRow[] = [];
  let index = 0;
  for (const row of rows) {
    const valueDate = parseFlexibleDate(row[dateCol]);
    if (!valueDate) {
      index++;
      continue;
    }
    const signed = parseRusAmount(row[amountCol]);
    if (signed === null) {
      index++;
      continue;
    }
    const amount = Math.abs(signed);
    if (amount === 0) {
      index++;
      continue;
    }
    const direction = inferDirection(directionCol ? row[directionCol] : null, signed);
    const currency = (currencyCol && row[currencyCol]) || 'KZT';
    const counterpartyName = counterpartyCol ? row[counterpartyCol] || null : null;
    const counterpartyAccount = accountCol ? row[accountCol] || null : null;
    const counterpartyInn = binCol ? row[binCol] || null : null;
    const narrative = narrativeCol ? row[narrativeCol] || null : null;
    const docNumber = numberCol ? row[numberCol] || null : null;

    const externalId = docNumber
      ? `kaspi:${docNumber}:${valueDate.toISOString().slice(0, 10)}`
      : deriveExternalId({
          valueDate,
          amount,
          direction,
          narrative,
          counterpartyAccount,
          index,
        });

    out.push({
      valueDate,
      direction,
      amount,
      currency,
      counterpartyName,
      counterpartyAccount,
      counterpartyInn,
      narrative,
      externalId,
    });
    index++;
  }
  return out;
}
