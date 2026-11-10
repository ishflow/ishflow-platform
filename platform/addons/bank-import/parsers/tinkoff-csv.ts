/**
 * Tinkoff Business CSV statement parser.
 *
 * Tinkoff exports come in two flavours: a Russian-header `;`-delimited file
 * and an English-header `,`-delimited file. Both are accepted here — the
 * parser introspects whichever column set matches the first row's keys.
 *
 * Russian columns:
 *   Дата операции;Сумма операции;Валюта;Контрагент;Назначение;ИНН
 *
 * English columns:
 *   Operation Date,Amount,Currency,Counterparty,Description,INN
 *
 * Sign of `Amount` determines direction (negative = `out`).
 */

import { deriveExternalId } from '../normalize';
import { findColumn, parseCsvBuffer, parseFlexibleDate, parseRusAmount } from './csv-util';
import type { ParseBufferOptions, ParsedRow } from './types';

const HEADERS = {
  number: ['ID операции', 'Operation ID', 'Document No', 'Document', '№', 'ID'],
  date: ['Дата операции', 'Operation Date', 'Дата', 'Date', 'Дата проводки'],
  amount: ['Сумма операции', 'Сумма', 'Amount', 'Total'],
  currency: ['Валюта', 'Currency'],
  counterparty: ['Контрагент', 'Counterparty', 'Plательщик/Получатель'],
  account: ['Счёт контрагента', 'Счет контрагента', 'Counterparty Account', 'Account'],
  inn: ['ИНН', 'INN', 'ИНН контрагента'],
  narrative: ['Назначение', 'Description', 'Назначение платежа', 'Comment'],
} as const;

export function parseTinkoffCsv(buf: Buffer, opts?: ParseBufferOptions): ParsedRow[] {
  const { rows } = parseCsvBuffer(buf, opts);
  const probe = rows[0];
  if (!probe) return [];

  const numberCol = findColumn(probe, HEADERS.number);
  const dateCol = findColumn(probe, HEADERS.date);
  const amountCol = findColumn(probe, HEADERS.amount);
  const currencyCol = findColumn(probe, HEADERS.currency);
  const counterpartyCol = findColumn(probe, HEADERS.counterparty);
  const accountCol = findColumn(probe, HEADERS.account);
  const innCol = findColumn(probe, HEADERS.inn);
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
    const direction: 'in' | 'out' = signed < 0 ? 'out' : 'in';
    const currency = (currencyCol && row[currencyCol]) || 'RUB';
    const counterpartyName = counterpartyCol ? row[counterpartyCol] || null : null;
    const counterpartyAccount = accountCol ? row[accountCol] || null : null;
    const counterpartyInn = innCol ? row[innCol] || null : null;
    const narrative = narrativeCol ? row[narrativeCol] || null : null;
    const docNumber = numberCol ? row[numberCol] || null : null;

    const externalId = docNumber
      ? `tinkoff:${docNumber}:${valueDate.toISOString().slice(0, 10)}`
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
