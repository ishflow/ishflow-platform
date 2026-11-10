import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const MAX_ROWS = 1000;

export type ParseErrorCode =
  | 'empty'
  | 'no_rows'
  | 'unsupported_format'
  | 'too_many_rows'
  | 'parse_failed';

export type ParseError = { code: ParseErrorCode; message: string };

export type ParseResult = {
  headers: string[];
  rows: Record<string, string>[];
  errors: ParseError[];
};

function detectFormat(filename: string): 'csv' | 'xlsx' | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx';
  return null;
}

function normaliseCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function parseCsv(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
  const text = buffer.toString('utf-8');
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
    transform: (v) => normaliseCell(v),
  });
  const headers = (parsed.meta.fields ?? []).map((h) => h.trim()).filter(Boolean);
  const rows = (parsed.data ?? []).map((row) => {
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = normaliseCell(row[h]);
    return out;
  });
  return { headers, rows };
}

function parseXlsx(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (aoa.length === 0) return { headers: [], rows: [] };
  const headers = (aoa[0] as unknown[]).map((h) => normaliseCell(h)).filter(Boolean);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const raw = aoa[i] as unknown[];
    const row: Record<string, string> = {};
    let hasValue = false;
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (!header) continue;
      const cell = normaliseCell(raw[j]);
      row[header] = cell;
      if (cell !== '') hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  return { headers, rows };
}

export async function parseUpload(buffer: Buffer, filename: string): Promise<ParseResult> {
  const format = detectFormat(filename);
  if (!format) {
    return {
      headers: [],
      rows: [],
      errors: [{ code: 'unsupported_format', message: `Unsupported format: ${filename}` }],
    };
  }
  if (buffer.byteLength === 0) {
    return { headers: [], rows: [], errors: [{ code: 'empty', message: 'File is empty' }] };
  }
  let parsed: { headers: string[]; rows: Record<string, string>[] };
  try {
    parsed = format === 'csv' ? parseCsv(buffer) : parseXlsx(buffer);
  } catch (err) {
    return {
      headers: [],
      rows: [],
      errors: [{ code: 'parse_failed', message: (err as Error).message }],
    };
  }
  if (parsed.rows.length === 0) {
    return {
      headers: parsed.headers,
      rows: [],
      errors: [{ code: 'no_rows', message: 'No data rows found after header' }],
    };
  }
  if (parsed.rows.length > MAX_ROWS) {
    return {
      headers: parsed.headers,
      rows: [],
      errors: [
        {
          code: 'too_many_rows',
          message: `File has ${parsed.rows.length} rows; max is ${MAX_ROWS}. Split the file and import in batches.`,
        },
      ],
    };
  }
  return { ...parsed, errors: [] };
}
