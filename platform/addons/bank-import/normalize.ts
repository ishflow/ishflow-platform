import { createHash } from 'node:crypto';

/**
 * Cyrillic / Latin tokenisation that strips noisy company-form prefixes so
 * `"ООО Ромашка"` and `"Ромашка ООО"` and `"Ромашка"` all hash to the same
 * token bag for fuzzy match scoring.
 *
 * Returns LOWERCASED, punctuation-stripped tokens in stable insertion order.
 * Empty input → empty array.
 */
const COMPANY_FORM_STOPWORDS = new Set([
  // Russian
  'ооо',
  'оао',
  'зао',
  'пао',
  'нко',
  'нп',
  'тоо',
  'ип',
  'ао',
  'ктж',
  'фл',
  'ил',
  // Latin transliteration of Russian forms
  'ooo',
  'oao',
  'zao',
  'pao',
  // Kazakhstan
  'too',
  // English
  'llc',
  'ltd',
  'inc',
  'corp',
  'co',
  'plc',
  'gmbh',
  'oy',
  'ag',
  'sa',
  // Turkish
  'a.ş',
  'as',
  'ltd.şti',
  'ltd.sti',
  'tic',
  'san',
]);

export function normalizeName(input: string | null | undefined): string[] {
  if (!input) return [];
  // Drop quotes commonly wrapping the legal name: « », " ", ' ', “ ”, ‘ ’.
  const cleaned = input
    .replace(/[«»""""'']/g, ' ')
    .replace(/[.,;:!?()\[\]{}\/\\]/g, ' ')
    .toLowerCase()
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .filter((t) => !COMPANY_FORM_STOPWORDS.has(t))
    // Drop pure-numeric tokens (account fragments, INNs, etc) — they're not
    // discriminating for *name* overlap and bias the score.
    .filter((t) => !/^\d+$/.test(t));
  return tokens;
}

/**
 * Jaccard-style token overlap. Returns a score in `[0, 1]`: 1 = identical
 * token bag, 0 = no shared tokens. Empty input on either side → 0.
 */
export function tokenOverlap(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const tok of setA) if (setB.has(tok)) shared++;
  const union = setA.size + setB.size - shared;
  if (union === 0) return 0;
  return shared / union;
}

/**
 * INN equality with light normalisation: both sides trimmed, non-digit
 * characters stripped (some banks export `"INN: 7707083893"`). Returns false
 * when either side is empty.
 */
export function innMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = a.replace(/\D/g, '');
  const right = b.replace(/\D/g, '');
  if (!left || !right) return false;
  return left === right;
}

/**
 * Build a stable external id when the bank statement provided none. We hash
 * the row's invariant fields so re-importing the same statement file does NOT
 * insert duplicate `BankStatementRow` rows (the table has a unique constraint
 * on `(tenantId, externalId)`).
 *
 * The `index` tail disambiguates rows that share the exact same payload — rare
 * but possible (e.g. two identical sub-1 RUB top-ups on the same day).
 */
export function deriveExternalId(parts: {
  valueDate: Date;
  amount: number;
  direction: 'in' | 'out';
  narrative: string | null;
  counterpartyAccount: string | null;
  index: number;
}): string {
  const h = createHash('sha256');
  h.update(parts.valueDate.toISOString().slice(0, 10));
  h.update('|');
  h.update(parts.direction);
  h.update('|');
  h.update(parts.amount.toFixed(2));
  h.update('|');
  h.update(parts.narrative ?? '');
  h.update('|');
  h.update(parts.counterpartyAccount ?? '');
  h.update('|');
  h.update(String(parts.index));
  return `derived:${h.digest('hex').slice(0, 24)}`;
}
