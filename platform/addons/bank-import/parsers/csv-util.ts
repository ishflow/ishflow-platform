import Papa from 'papaparse';
import { decodeText } from './cp1251';
import type { ParseBufferOptions } from './types';

/**
 * Parse a CSV buffer using papaparse with header detection. Handles UTF-8
 * BOM, CP1251 encoding (Russian bank legacy), and the two common Russian
 * delimiters: `;` (Sber, Tinkoff) and `,` (English exports).
 *
 * Auto-detects the delimiter when not supplied.
 */
export function parseCsvBuffer(
  buf: Buffer,
  opts?: ParseBufferOptions & { delimiter?: string },
): { headers: string[]; rows: Record<string, string>[] } {
  const text = decodeText(buf, opts?.encoding);
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: opts?.delimiter,
    transformHeader: (h) => h.trim(),
    transform: (v) => (v ?? '').toString().trim(),
  });
  const headers = (parsed.meta.fields ?? []).map((h) => h.trim()).filter(Boolean);
  const rows = (parsed.data ?? []).map((row) => {
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = (row[h] ?? '').toString().trim();
    return out;
  });
  return { headers, rows };
}

/**
 * Locate the first row column whose header matches any candidate. Header
 * matching is case-insensitive and whitespace-collapsed so we tolerate the
 * many cosmetic variations bank exports ship with.
 */
export function findColumn(
  row: Record<string, string>,
  candidates: readonly string[],
): string | null {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const target = cand.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const key of keys) {
      if (key.toLowerCase().replace(/\s+/g, ' ').trim() === target) {
        return key;
      }
    }
  }
  return null;
}

/**
 * Parse a date string in `DD.MM.YYYY`, `DD/MM/YYYY` or `YYYY-MM-DD` form. Most
 * Russian banks emit DD.MM.YYYY; Tinkoff sometimes uses ISO. Returns null on
 * any other shape.
 */
export function parseFlexibleDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const ddmmyyyy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (iso) {
    const [, yyyy, mm, dd] = iso;
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

/**
 * Russian-locale-tolerant number parser: strips thin spaces (NBSP), normal
 * spaces, and the trailing currency code suffix that Tinkoff sometimes adds.
 * Accepts both `,` and `.` as the decimal separator. Returns null when the
 * remaining string is not a finite number.
 */
export function parseRusAmount(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const cleaned = value
    .toString()
    .replace(/[  \s]+/g, '')
    .replace(/[A-Za-zА-Яа-я]+$/u, '');
  if (!cleaned) return null;
  // Russian decimal commas: replace ONLY the last comma if it's followed by 1-3 digits
  let normalized = cleaned;
  if (/,\d{1,3}$/.test(cleaned) && !cleaned.includes('.')) {
    normalized = cleaned.replace(',', '.');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
