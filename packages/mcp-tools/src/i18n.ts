import en from '../messages/en.json';
import ru from '../messages/ru.json';
import trMsg from '../messages/tr.json';

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out[key] = v;
    } else if (v && typeof v === 'object') {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    }
  }
  return out;
}

const CATALOGS: Record<string, Record<string, string>> = {
  en: flatten(en as Record<string, unknown>),
  ru: flatten(ru as Record<string, unknown>),
  tr: flatten(trMsg as Record<string, unknown>),
};

/**
 * Resolve a translation key in the given locale. Falls back to `en` for
 * unknown locales and missing keys; returns null for keys missing in both.
 */
export function tr(key: string, locale: string): string | null {
  const cat = CATALOGS[locale] ?? CATALOGS.en;
  return cat?.[key] ?? CATALOGS.en?.[key] ?? null;
}
