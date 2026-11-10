// Server-safe tenant fixture + types. Lives in a plain .ts module (no
// 'use client') so server components (layouts) can `.find()` over it.
//
// Previously this data was exported from sa-tenant-list.tsx ('use client');
// Turbopack wrapped the client module and exposed the constant as a client
// reference object, making `SA_TENANT_FIXTURE.find is not a function` blow up
// every /super-admin/tenants/[id]/* route.

export type SaTenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: 'Business' | 'Pro' | 'Free' | 'Trial';
  mrrUsd: number;
  members: number;
  invoices: number;
  lastActivity: string;
  region: string;
  /** `tr`, `ru`, `en`, etc. */
  locale: string;
  suspended: boolean;
};

export type FilterKey = 'all' | 'business' | 'pro' | 'free' | 'trial' | 'suspended';

/**
 * Fixed placeholder fixture so the list page renders without a DB. Real data
 * is wired during integration via `withBypass` + cross-tenant query.
 */
export const SA_TENANT_FIXTURE: SaTenantRow[] = [
  {
    id: 'tenant_01HX8K3J9TECHHUB',
    name: 'Tech Hub Istanbul',
    slug: 'techhub.istanbul',
    plan: 'Business',
    mrrUsd: 199,
    members: 12,
    invoices: 428,
    lastActivity: '17.05 09:42',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9FUTURE',
    name: 'Future Retail',
    slug: 'futureretail',
    plan: 'Business',
    mrrUsd: 199,
    members: 9,
    invoices: 312,
    lastActivity: '17.05 08:18',
    region: '🇷🇺 ru',
    locale: 'ru',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9SAMSUNG',
    name: 'Samsung Wholesale',
    slug: 'samsungwholesale',
    plan: 'Business',
    mrrUsd: 199,
    members: 14,
    invoices: 512,
    lastActivity: '17.05 07:55',
    region: '🇰🇷 ru',
    locale: 'ru',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9SAMPLE',
    name: 'Sample Trading',
    slug: 'sample-trading',
    plan: 'Pro',
    mrrUsd: 49,
    members: 4,
    invoices: 218,
    lastActivity: '17.05 09:14',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9VATAN',
    name: 'Vatan Bilgisayar',
    slug: 'vatan',
    plan: 'Pro',
    mrrUsd: 49,
    members: 6,
    invoices: 182,
    lastActivity: '16.05 18:42',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9GLOBEX',
    name: 'Globex Distribution',
    slug: 'globex',
    plan: 'Pro',
    mrrUsd: 49,
    members: 5,
    invoices: 142,
    lastActivity: '16.05 16:08',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9MAVI',
    name: 'Mavi Elektronik',
    slug: 'mavielektronik',
    plan: 'Pro',
    mrrUsd: 29,
    members: 2,
    invoices: 68,
    lastActivity: '16.05 14:22',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9DIGITAL',
    name: 'Digital World Ankara',
    slug: 'digitalworld',
    plan: 'Pro',
    mrrUsd: 49,
    members: 3,
    invoices: 88,
    lastActivity: '16.05 11:24',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: true,
  },
  {
    id: 'tenant_01HX8K3J9PAMIR',
    name: 'Pamir Group',
    slug: 'pamirgroup',
    plan: 'Trial',
    mrrUsd: 0,
    members: 2,
    invoices: 12,
    lastActivity: '17.05 06:08',
    region: '🇰🇬 ky',
    locale: 'ky',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9ALMATY',
    name: 'Almaty Plaza',
    slug: 'almatyplaza',
    plan: 'Trial',
    mrrUsd: 0,
    members: 3,
    invoices: 8,
    lastActivity: '16.05 19:42',
    region: '🇰🇿 ru',
    locale: 'ru',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9TRABZON',
    name: 'Trabzon Ticaret',
    slug: 'trabzonticaret',
    plan: 'Free',
    mrrUsd: 0,
    members: 1,
    invoices: 22,
    lastActivity: '15.05 14:08',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9ACME',
    name: 'Acme Supply Co.',
    slug: 'acme',
    plan: 'Free',
    mrrUsd: 0,
    members: 1,
    invoices: 14,
    lastActivity: '14.05 22:18',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: false,
  },
  {
    id: 'tenant_01HX8K3J9BILKENT',
    name: 'Bilkent Outlet',
    slug: 'bilkentoutlet',
    plan: 'Pro',
    mrrUsd: 49,
    members: 2,
    invoices: 42,
    lastActivity: '13.05 18:42',
    region: '🇹🇷 tr',
    locale: 'tr',
    suspended: true,
  },
];

export const SA_TENANT_COUNTS: Record<FilterKey, number> = {
  all: 142,
  business: 20,
  pro: 59,
  free: 40,
  trial: 23,
  suspended: 4,
};
