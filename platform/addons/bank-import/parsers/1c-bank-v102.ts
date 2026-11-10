/**
 * Parser for the 1С-Bank-Client v1.02 plain-text exchange format — the
 * Russian de-facto standard for bank → accounting integration.
 *
 * Layout (simplified):
 *
 *   1CClientBankExchange
 *   ВерсияФормата=1.02
 *   Кодировка=Windows
 *   ...header...
 *   СекцияРасчСчет
 *   РасчСчет=40702810000000000000
 *   КонецРасчСчета
 *   СекцияДокумент=Платежное поручение
 *   Номер=123
 *   Дата=01.05.2026
 *   Сумма=10000.00
 *   ПлательщикСчет=40702810000000000000
 *   Плательщик=ООО Ромашка
 *   ПлательщикИНН=7707083893
 *   ПолучательСчет=40702810999999999999
 *   Получатель=ООО Лютик
 *   ПолучательИНН=7707083111
 *   НазначениеПлатежа=Оплата по счету №42
 *   ДатаПоступило=02.05.2026
 *   КонецДокумента
 *   ...more documents...
 *   КонецФайла
 *
 * Direction is computed by comparing the document's
 * `ПлательщикСчет` (payer account) against the file's own
 * `РасчСчет` (settlement account) declared in the header — if they match, the
 * tenant is the PAYER and direction is `out`; otherwise `in`.
 */

import { deriveExternalId } from '../normalize';
import { decodeText } from './cp1251';
import type { ParseBufferOptions, ParsedRow } from './types';

function parseRusDate(value: string): Date | null {
  // 1С exports dates as DD.MM.YYYY.
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isFinite(d.getTime()) ? d : null;
}

function parseAmount(value: string): number | null {
  // 1С uses both `.` and `,` as the decimal separator depending on locale.
  const normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Walk lines and yield document blocks. A block opens at
 * `СекцияДокумент=…` and closes at `КонецДокумента`. Lines outside any block
 * may carry the global `РасчСчет` that we use for direction inference.
 */
function* iterDocumentBlocks(
  body: string,
): Generator<{ headerAccount: string | null; entries: Map<string, string> }> {
  const lines = body.split(/\r?\n/);
  let headerAccount: string | null = null;
  let inHeader = false;
  let inDocument = false;
  let current: Map<string, string> | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === 'СекцияРасчСчет') {
      inHeader = true;
      continue;
    }
    if (line === 'КонецРасчСчета') {
      inHeader = false;
      continue;
    }
    if (line.startsWith('СекцияДокумент')) {
      inDocument = true;
      current = new Map();
      continue;
    }
    if (line === 'КонецДокумента') {
      if (current) {
        yield { headerAccount, entries: current };
      }
      current = null;
      inDocument = false;
      continue;
    }
    if (line === 'КонецФайла') break;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (inHeader && key === 'РасчСчет' && !headerAccount) {
      headerAccount = value;
    }
    if (inDocument && current) {
      // First occurrence wins for repeated keys.
      if (!current.has(key)) current.set(key, value);
    }
  }
}

export function parse1cBankV102(buf: Buffer, opts?: ParseBufferOptions): ParsedRow[] {
  const body = decodeText(buf, opts?.encoding);
  const rows: ParsedRow[] = [];
  let index = 0;
  for (const block of iterDocumentBlocks(body)) {
    const e = block.entries;
    const dateStr = e.get('Дата') ?? e.get('ДатаПоступило');
    if (!dateStr) continue;
    const valueDate = parseRusDate(dateStr);
    if (!valueDate) continue;

    const amountStr = e.get('Сумма');
    if (!amountStr) continue;
    const amount = parseAmount(amountStr);
    if (amount === null || amount <= 0) continue;

    const payerAccount = e.get('ПлательщикСчет') ?? null;
    const receiverAccount = e.get('ПолучательСчет') ?? null;
    const headerAccount = block.headerAccount;

    // Direction: if the file's own settlement account is the PAYER on this
    // document, the tenant is sending money out. Otherwise treat as incoming.
    let direction: 'in' | 'out';
    if (headerAccount && payerAccount && headerAccount === payerAccount) {
      direction = 'out';
    } else if (headerAccount && receiverAccount && headerAccount === receiverAccount) {
      direction = 'in';
    } else if (payerAccount && !receiverAccount) {
      direction = 'out';
    } else {
      direction = 'in';
    }

    const counterpartyName =
      direction === 'out' ? (e.get('Получатель') ?? null) : (e.get('Плательщик') ?? null);
    const counterpartyAccount = direction === 'out' ? receiverAccount : payerAccount;
    const counterpartyInn =
      direction === 'out' ? (e.get('ПолучательИНН') ?? null) : (e.get('ПлательщикИНН') ?? null);
    const narrative = e.get('НазначениеПлатежа') ?? e.get('Назначение') ?? null;

    const docNumber = e.get('Номер') ?? null;
    const externalId = docNumber
      ? `1c:${docNumber}:${valueDate.toISOString().slice(0, 10)}`
      : deriveExternalId({
          valueDate,
          amount,
          direction,
          narrative,
          counterpartyAccount,
          index,
        });

    rows.push({
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
  return rows;
}
