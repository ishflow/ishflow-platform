import type { TenantPlan } from '@prisma/client';

// rates frozen 2026-05-12
type Interval = 'month' | 'year';
export type SupportedCurrency = 'USD' | 'EUR' | 'RUB' | 'TRY';

export const PLAN_DISPLAY_PRICES: Record<
  TenantPlan,
  Record<Interval, Record<SupportedCurrency, string>>
> = {
  free: {
    month: { USD: 'Free', EUR: 'Free', RUB: 'Бесплатно', TRY: 'Ücretsiz' },
    year: { USD: 'Free', EUR: 'Free', RUB: 'Бесплатно', TRY: 'Ücretsiz' },
  },
  starter: {
    month: { USD: '$19/mo', EUR: '€17/mo', RUB: '1 800 ₽/mo', TRY: '₺499/mo' },
    year: { USD: '$190/yr', EUR: '€170/yr', RUB: '18 000 ₽/yr', TRY: '₺4 990/yr' },
  },
  pro: {
    month: { USD: '$49/mo', EUR: '€45/mo', RUB: '4 500 ₽/mo', TRY: '₺1 299/mo' },
    year: { USD: '$490/yr', EUR: '€450/yr', RUB: '45 000 ₽/yr', TRY: '₺12 990/yr' },
  },
  business: {
    month: { USD: '$99/mo', EUR: '€90/mo', RUB: '9 000 ₽/mo', TRY: '₺2 599/mo' },
    year: { USD: '$990/yr', EUR: '€900/yr', RUB: '90 000 ₽/yr', TRY: '₺25 990/yr' },
  },
  enterprise: {
    month: {
      USD: 'Contact us',
      EUR: 'Contact us',
      RUB: 'Свяжитесь с нами',
      TRY: 'Bizimle iletişime geçin',
    },
    year: {
      USD: 'Contact us',
      EUR: 'Contact us',
      RUB: 'Свяжитесь с нами',
      TRY: 'Bizimle iletişime geçin',
    },
  },
};

const SUPPORTED: ReadonlySet<string> = new Set(['USD', 'EUR', 'RUB', 'TRY']);

export function getPlanDisplayPrice(
  plan: TenantPlan,
  interval: Interval,
  currency: string,
): string {
  const key = SUPPORTED.has(currency) ? (currency as SupportedCurrency) : 'USD';
  return PLAN_DISPLAY_PRICES[plan][interval][key];
}
