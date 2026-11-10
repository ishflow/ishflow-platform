import type { Locale, LocalizedLabel } from '../types';

/**
 * Pick the locale-matching string from a `LocalizedLabel`, falling back to
 * the English value when the requested locale is missing.
 */
export function pickLabel(label: LocalizedLabel, locale: Locale | string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}
