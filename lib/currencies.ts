/**
 * Supported operational currencies.
 *
 * Each tenant works in ONE currency, chosen at signup and changeable from
 * Settings → General by the org owner. The chosen code is stored on
 * `tenant.currency` and drives all money formatting across the app — the symbol
 * is derived at render time via `Intl.NumberFormat` (see `lib/format-money.ts`),
 * so `symbol` here is only for picker tiles.
 *
 * This replaced the per-tenant editable currency catalog (`catalog_platform_currency`)
 * when multi-currency / FX was removed.
 */
export type SupportedCurrency = { code: string; name: string; symbol: string };

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'сом' },
  { code: 'UZS', name: 'Uzbek Som', symbol: 'сўм' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
];

export const SUPPORTED_CURRENCY_CODES: string[] = SUPPORTED_CURRENCIES.map((c) => c.code);

/** Fallback used when a tenant has no currency set yet. */
export const DEFAULT_CURRENCY = 'USD';

export function isSupportedCurrency(code: string | null | undefined): boolean {
  return code != null && SUPPORTED_CURRENCY_CODES.includes(code);
}
