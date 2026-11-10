import {
  ArrowUpCircle,
  BarChart3,
  Building,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  ToggleLeft,
  TrendingUp,
  Users,
} from 'lucide-react';

export type SaRailKey =
  | 'dashboard'
  | 'tenants'
  | 'billing'
  | 'revenue'
  | 'audit'
  | 'analytics'
  | 'cms'
  | 'comms'
  | 'marketingLanding'
  | 'mobile'
  | 'support'
  | 'system'
  | 'users';

export type SaRailDef = {
  key: SaRailKey;
  icon: LucideIcon;
  i18nKey: string;
  href: string;
};

export type SaPanelItem = {
  i18nKey: string;
  href: string;
  icon?: LucideIcon;
};

export type SaPanelSection = {
  i18nKey: string;
  items: SaPanelItem[];
};

export const SA_RAIL: SaRailDef[] = [
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    i18nKey: 'rail.dashboard',
    href: '/super-admin/dashboard',
  },
  { key: 'tenants', icon: Building, i18nKey: 'rail.tenants', href: '/super-admin/tenants' },
  {
    key: 'billing',
    icon: CreditCard,
    i18nKey: 'rail.billing',
    href: '/super-admin/billing',
  },
  {
    key: 'revenue',
    icon: TrendingUp,
    i18nKey: 'rail.revenue',
    href: '/super-admin/revenue',
  },
  { key: 'audit', icon: ShieldCheck, i18nKey: 'rail.audit', href: '/super-admin/audit' },
  {
    key: 'analytics',
    icon: BarChart3,
    i18nKey: 'rail.analytics',
    href: '/super-admin/analytics',
  },
  { key: 'cms', icon: FileText, i18nKey: 'rail.cms', href: '/super-admin/cms/sections' },
  { key: 'comms', icon: Send, i18nKey: 'rail.comms', href: '/super-admin/comms' },
  {
    key: 'marketingLanding',
    icon: FileText,
    i18nKey: 'rail.marketingLanding',
    href: '/super-admin/marketing-landing',
  },
  { key: 'mobile', icon: Smartphone, i18nKey: 'rail.mobile', href: '/super-admin/mobile' },
  { key: 'support', icon: LifeBuoy, i18nKey: 'rail.support', href: '/super-admin/support' },
  { key: 'system', icon: Settings, i18nKey: 'rail.system', href: '/super-admin/system' },
  { key: 'users', icon: Users, i18nKey: 'rail.users', href: '/super-admin/users' },
];

const LOCALES = new Set(['ru', 'en', 'tr', 'uz', 'ky', 'de', 'fr', 'zh']);

/**
 * Locale-stripped pathname → active SaRailKey.
 *
 * Accepts paths like `/super-admin/tenants/abc123/activity` and matches by
 * the segment after `super-admin`. Defaults to `dashboard`.
 */
export function activeSaRailFromPath(pathname: string): SaRailKey {
  const parts = pathname.split('/').filter(Boolean);
  let i = 0;
  const first = parts[i];
  if (first && LOCALES.has(first)) i++;
  if (parts[i] === 'v2') i++;
  if (parts[i] === 'super-admin') i++;
  const seg = parts[i];
  if (!seg) return 'dashboard';
  if (seg === 'marketing-landing') return 'marketingLanding';
  const match = SA_RAIL.find((r) => r.key === seg);
  return (match?.key ?? 'dashboard') as SaRailKey;
}

export const SA_PANELS: Record<SaRailKey, SaPanelSection[]> = {
  dashboard: [
    {
      i18nKey: 'panel.dashboard.overview',
      items: [
        {
          i18nKey: 'panel.dashboard.summary',
          href: '/super-admin/dashboard',
          icon: LayoutDashboard,
        },
        {
          i18nKey: 'panel.dashboard.analytics',
          href: '/super-admin/analytics',
          icon: BarChart3,
        },
      ],
    },
    {
      i18nKey: 'panel.dashboard.quickActions',
      items: [
        {
          i18nKey: 'panel.dashboard.tenantList',
          href: '/super-admin/tenants',
          icon: Building,
        },
        {
          i18nKey: 'panel.dashboard.openSupport',
          href: '/super-admin/support',
          icon: LifeBuoy,
        },
        {
          i18nKey: 'panel.dashboard.failedPayments',
          href: '/super-admin/billing',
          icon: CreditCard,
        },
      ],
    },
  ],
  tenants: [
    {
      i18nKey: 'panel.tenants.main',
      items: [{ i18nKey: 'panel.tenants.all', href: '/super-admin/tenants', icon: Building }],
    },
  ],
  billing: [
    {
      i18nKey: 'panel.billing.main',
      items: [
        { i18nKey: 'panel.billing.overview', href: '/super-admin/billing', icon: CreditCard },
        { i18nKey: 'panel.billing.revenue', href: '/super-admin/revenue', icon: TrendingUp },
      ],
    },
  ],
  revenue: [
    {
      i18nKey: 'panel.revenue.main',
      items: [
        { i18nKey: 'panel.revenue.overview', href: '/super-admin/revenue', icon: TrendingUp },
      ],
    },
  ],
  audit: [
    {
      i18nKey: 'panel.audit.main',
      items: [{ i18nKey: 'panel.audit.list', href: '/super-admin/audit', icon: ShieldCheck }],
    },
  ],
  analytics: [
    {
      i18nKey: 'panel.analytics.main',
      items: [
        { i18nKey: 'panel.analytics.overview', href: '/super-admin/analytics', icon: BarChart3 },
      ],
    },
  ],
  cms: [
    {
      i18nKey: 'panel.cms.content',
      items: [
        { i18nKey: 'panel.cms.sections', href: '/super-admin/cms/sections', icon: FileText },
        { i18nKey: 'panel.cms.blog', href: '/super-admin/cms/blog', icon: FileText },
      ],
    },
    {
      i18nKey: 'panel.cms.engagement',
      items: [
        { i18nKey: 'panel.cms.leads', href: '/super-admin/cms/leads', icon: Users },
        { i18nKey: 'panel.cms.media', href: '/super-admin/cms/media', icon: FileText },
        { i18nKey: 'panel.cms.newsletter', href: '/super-admin/cms/newsletter', icon: Send },
      ],
    },
  ],
  comms: [
    {
      i18nKey: 'panel.comms.main',
      items: [
        { i18nKey: 'panel.comms.list', href: '/super-admin/comms', icon: Send },
        { i18nKey: 'panel.comms.new', href: '/super-admin/comms/new', icon: Send },
        {
          i18nKey: 'panel.comms.analytics',
          href: '/super-admin/comms/analytics',
          icon: BarChart3,
        },
      ],
    },
  ],
  marketingLanding: [
    {
      i18nKey: 'panel.marketingLanding.main',
      items: [
        {
          i18nKey: 'panel.marketingLanding.editor',
          href: '/super-admin/marketing-landing',
          icon: FileText,
        },
      ],
    },
  ],
  mobile: [
    {
      i18nKey: 'panel.mobile.main',
      items: [{ i18nKey: 'panel.mobile.overview', href: '/super-admin/mobile', icon: Smartphone }],
    },
  ],
  support: [
    {
      i18nKey: 'panel.support.main',
      items: [
        { i18nKey: 'panel.support.inbox', href: '/super-admin/support', icon: LifeBuoy },
        { i18nKey: 'panel.support.upgrades', href: '/super-admin/upgrades', icon: ArrowUpCircle },
      ],
    },
  ],
  system: [
    {
      i18nKey: 'panel.system.main',
      items: [
        { i18nKey: 'panel.system.overview', href: '/super-admin/system', icon: Settings },
        {
          i18nKey: 'panel.system.settings',
          href: '/super-admin/system/settings',
          icon: Settings,
        },
        {
          i18nKey: 'panel.system.apiKeys',
          href: '/super-admin/system/api-keys',
          icon: ShieldCheck,
        },
        {
          i18nKey: 'panel.system.cronRuns',
          href: '/super-admin/system/cron-runs',
          icon: Settings,
        },
        {
          i18nKey: 'panel.system.features',
          href: '/super-admin/system/features',
          icon: ToggleLeft,
        },
      ],
    },
  ],
  users: [
    {
      i18nKey: 'panel.users.main',
      items: [{ i18nKey: 'panel.users.list', href: '/super-admin/users', icon: Users }],
    },
  ],
};
