/**
 * Server actions return raw error keys (e.g. `insufficientStock`,
 * `at_least_one_line_required`, `required`, `permissionDenied`). The wizard
 * components render `formError` and `fieldError` directly to the user, so
 * any raw key shows through — confusing for non-technical end-users.
 *
 * `documentErrorMessage(t, key, fallback)` looks the key up in `messages/`
 * (`document.<key>` first, then `v2_documents.errors.<key>`) and falls back
 * to either the provided default text or the raw key.
 *
 * Use from a client component that already has `useTranslations()` like:
 *
 *     const tDoc = useTranslations('document');
 *     const tErr = useTranslations('v2_documents.errors');
 *     const message = documentErrorMessage({ tDoc, tErr }, formError, formError);
 */
export type DocumentErrorTranslators = {
  /** From `useTranslations('document')`. */
  tDoc: (key: string) => string;
  /** From `useTranslations('v2_documents.errors')`. */
  tErr: (key: string) => string;
};

const DOC_KEYS = new Set([
  'permissionDenied',
  'notFound',
  'invalidStatus',
  'periodClosed',
  'insufficientStock',
  'belowCost',
  'currencyNotEnabled',
]);

const ERR_KEYS = new Set([
  'required',
  'at_least_one_line_required',
  'currencyNotEnabled',
  'errorGeneric',
]);

export function documentErrorMessage(
  translators: DocumentErrorTranslators,
  key: string | undefined | null,
  fallback?: string,
): string {
  if (!key) return fallback ?? '';
  if (DOC_KEYS.has(key)) {
    try {
      return translators.tDoc(key);
    } catch {
      /* fallthrough */
    }
  }
  if (ERR_KEYS.has(key)) {
    try {
      return translators.tErr(key);
    } catch {
      /* fallthrough */
    }
  }
  // Handle planLimit.* nested keys.
  if (key.startsWith('planLimit.')) {
    try {
      return translators.tDoc(key);
    } catch {
      /* fallthrough */
    }
  }
  return fallback ?? key;
}
