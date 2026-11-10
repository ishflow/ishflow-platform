/**
 * Sberbank Business CSV statement parser.
 *
 * Sber emits a `;`-delimited CSV with UTF-8 BOM and Russian column names:
 *
 *   № платежа;Дата;Сумма;Контрагент;Счёт контрагента;ИНН контрагента;Назначение платежа
 *
 * Sometimes the columns are split into `Сумма по дебету` / `Сумма по кредиту`
 * (debit / credit columns) — when both shapes ship the parser handles either.
 *
 * Direction inference:
 *   - Debit/Credit columns: debit > 0 → `out`, credit > 0 → `in`.
 *   - Single `Сумма` column: sign determines direction (minus → `out`).
 */

import { deriveExternalId } from '../normalize';
import { findColumn, parseCsvBuffer, parseFlexibleDate, parseRusAmount } from './csv-util';
import type { ParseBufferOptions, ParsedRow } from './types';

const HEADERS = {
  number: ['№ платежа', 'Номер документа', 'Документ', '№', 'Номер'],
  date: ['Дата', 'Дата операции', 'Дата проводки', 'Дата документа'],
  amount: ['Сумма', 'Сумма операции', 'Сумма платежа'],
  debit: ['Сумма по дебету', 'Дебет', 'Расход'],
  credit: ['Сумма по кредиту', 'Кредит', 'Приход'],
  counterparty: [
    'Контрагент',
    'Наименование контрагента',
    'Корреспондент',
    'Плательщик/Получатель',
  ],
  account: ['Счёт контрагента', 'Счет контрагента', 'Корр. счёт', 'Корр. счет', 'Расчётный счёт'],
  inn: ['ИНН контрагента', 'ИНН', 'ИНН корреспондента'],
  narrative: ['Назначение платежа', 'Назначение', 'Описание', 'Комментарий'],
} as const;

export function parseSberCsv(buf: Buffer, opts?: ParseBufferOptions): ParsedRow[] {
  const { rows } = parseCsvBuffer(buf, opts);
  const probe = rows[0];
  if (!probe) return [];

  const numberCol = findColumn(probe, HEADERS.number);
  const dateCol = findColumn(probe, HEADERS.date);
  const amountCol = findColumn(probe, HEADERS.amount);
  const debitCol = findColumn(probe, HEADERS.debit);
  const creditCol = findColumn(probe, HEADERS.credit);
  const counterpartyCol = findColumn(probe, HEADERS.counterparty);
  const accountCol = findColumn(probe, HEADERS.account);
  const innCol = findColumn(probe, HEADERS.inn);
  const narrativeCol = findColumn(probe, HEADERS.narrative);

  if (!dateCol) return [];

  const out: ParsedRow[] = [];
  let index = 0;
  for (const row of rows) {
    const valueDate = parseFlexibleDate(row[dateCol]);
    if (!valueDate) {
      index++;
      continue;
    }

    let amount: number | null = null;
    let direction: 'in' | 'out' = 'in';
    if (debitCol && creditCol) {
      const debit = parseRusAmount(row[debitCol]);
      const credit = parseRusAmount(row[creditCol]);
      if (debit && debit > 0) {
        amount = debit;
        direction = 'out';
      } else if (credit && credit > 0) {
        amount = credit;
        direction = 'in';
      }
    } else if (amountCol) {
      const value = parseRusAmount(row[amountCol]);
      if (value !== null) {
        amount = Math.abs(value);
        direction = value < 0 ? 'out' : 'in';
      }
    }
    if (amount === null || amount <= 0) {
      index++;
      continue;
    }

    const counterpartyName = counterpartyCol ? row[counterpartyCol] || null : null;
    const counterpartyAccount = accountCol ? row[accountCol] || null : null;
    const counterpartyInn = innCol ? row[innCol] || null : null;
    const narrative = narrativeCol ? row[narrativeCol] || null : null;
    const docNumber = numberCol ? row[numberCol] || null : null;

    const externalId = docNumber
      ? `sber:${docNumber}:${valueDate.toISOString().slice(0, 10)}`
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
      currency: 'RUB',
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
