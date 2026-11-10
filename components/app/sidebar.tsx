'use client';

import { useTabsOptional } from '@/components/app/tabs/use-tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar as SidebarPrimitive,
} from '@/components/ui/sidebar';
import { navManifest } from '@/lib/generated/nav';
import { filterNav } from '@/lib/nav/nav-permissions';
import { ADDON_CATALOG, type AddonKey, getAddonLabels } from '@/platform/addons';
import { hasPermission } from '@/platform/engine/permissions';
import { Link } from '@/platform/i18n/navigation';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BadgePercent,
  BarChart3,
  Barcode,
  Boxes,
  Building2,
  Calculator,
  ChevronRight,
  Coins,
  CreditCard,
  Database,
  DatabaseZap,
  FileSignature,
  FileText,
  HandCoins,
  Key,
  Landmark,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  MessageCircleQuestion,
  Package,
  PackagePlus,
  Palette,
  Printer,
  Puzzle,
  QrCode,
  Receipt,
  Scale,
  ScanText,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Tag,
  Tags,
  TrendingUp,
  Upload,
  UserCog,
  Users,
  UsersRound,
  Warehouse,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';

const iconByName: Record<string, LucideIcon> = {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BadgePercent,
  BarChart3,
  Boxes,
  Calculator,
  Coins,
  CreditCard,
  Database,
  FileText,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Lock,
  Package,
  PackagePlus,
  Palette,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
  Tags,
  TrendingUp,
  UserCog,
  Users,
  Warehouse,
};

const defaultIconFor = (kind: 'catalog' | 'document' | 'register'): LucideIcon =>
  kind === 'catalog' ? Database : kind === 'document' ? FileText : Scale;

function resolveIcon(
  name: string | undefined,
  kind: 'catalog' | 'document' | 'register',
): LucideIcon {
  return (name && iconByName[name]) || defaultIconFor(kind);
}

function stripLocale(p: string): string {
  // '/tr/catalogs/x' → '/catalogs/x'; '/tr' → '/'; '' → '/'
  const m = p.match(/^\/([a-z]{2})(?:(\/.*))?$/);
  if (!m) return p || '/';
  return m[2] ?? '/';
}

function CollapsibleGroup({
  id,
  label,
  defaultOpen,
  children,
}: {
  id: string;
  label: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem(`sidebar:group:${id}`) : null;
    if (stored != null) setOpen(stored === '1');
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`sidebar:group:${id}`, open ? '1' : '0');
  }, [id, open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup>
        <SidebarGroupLabel
          render={<CollapsibleTrigger className="flex w-full items-center justify-between" />}
        >
          <span>{label}</span>
          <ChevronRight
            data-state={open ? 'open' : 'closed'}
            className="h-4 w-4 transition-transform data-[state=open]:rotate-90"
          />
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

type SidebarProps = {
  counts?: Record<string, number>;
  adminLinks?: {
    audit: boolean;
    roles: boolean;
    members: boolean;
    mobileFeatures: boolean;
    periodClose: boolean;
    fxRates: boolean;
    billing: boolean;
    apiKeys: boolean;
    danger: boolean;
    branding: boolean;
    import: boolean;
  };
  permissions?: Set<string>;
  logoUrl?: string | null;
  enabledAddons?: AddonKey[];
};

const ADDON_ICONS: Record<string, LucideIcon> = {
  'scan-text': ScanText,
  landmark: Landmark,
  printer: Printer,
  'qr-code': QrCode,
  'file-signature': FileSignature,
  'file-text': FileText,
  send: Send,
  barcode: Barcode,
  'shopping-cart': ShoppingCart,
  'building-2': Building2,
  'users-round': UsersRound,
  'message-circle-question': MessageCircleQuestion,
  'database-zap': DatabaseZap,
};

/**
 * Sidebar uses plain locale-aware <Link>s (normal Next.js navigation — NOT
 * tab-opening). Clicking any link also calls `tabs?.deselect()` so that if a
 * tab was active, the new page content shows through underneath after nav.
 */
function NavLink(props: ComponentProps<typeof Link>) {
  const tabs = useTabsOptional();
  return (
    <Link
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) tabs?.deselect();
      }}
    />
  );
}

export function Sidebar({ counts, adminLinks, permissions, logoUrl, enabledAddons }: SidebarProps) {
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const visibleNav = permissions ? filterNav(navManifest, permissions) : navManifest;
  const tabs = useTabsOptional();
  // When a tab is active, the user is "looking at" that tab's URL even though
  // top-level pathname is something else; sidebar highlight follows the
  // active tab so the section indicator matches the user's actual context.
  const activeHref = tabs?.activeTab?.href ?? pathname;
  const current = stripLocale(activeHref);
  const isActive = (href: string) => current === href || current.startsWith(`${href}/`);

  const activeGroup:
    | 'catalogs'
    | 'documents'
    | 'registers'
    | 'reports'
    | 'addons'
    | 'admin'
    | null = (() => {
    if (current.startsWith('/catalogs/')) return 'catalogs';
    if (current.startsWith('/documents/')) return 'documents';
    if (current.startsWith('/registers/')) return 'registers';
    if (current === '/reports') return 'reports';
    if (current.startsWith('/addons')) return 'addons';
    if (current.startsWith('/admin/')) return 'admin';
    return null;
  })();

  const hasAdmin = Boolean(
    adminLinks &&
      (adminLinks.audit ||
        adminLinks.roles ||
        adminLinks.members ||
        adminLinks.mobileFeatures ||
        adminLinks.periodClose ||
        adminLinks.fxRates ||
        adminLinks.billing ||
        adminLinks.apiKeys ||
        adminLinks.danger ||
        adminLinks.branding ||
        adminLinks.import),
  );

  return (
    <SidebarPrimitive collapsible="icon">
      <SidebarHeader className="px-4 pt-4 pb-3">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-6 w-auto self-start" />
        ) : (
          <div className="flex h-6 items-center">
            <img
              src="/logo-light.svg"
              alt={common('appName')}
              width={96}
              height={24}
              className="h-6 w-auto dark:hidden"
            />
            <img
              src="/logo-dark.svg"
              alt={common('appName')}
              width={96}
              height={24}
              className="hidden h-6 w-auto dark:block"
            />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{nav('platform')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={nav('dashboard')}
                  isActive={isActive('/dashboard')}
                  render={<NavLink href="/dashboard" />}
                >
                  <LayoutDashboard />
                  <span>{nav('dashboard')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {visibleNav.some((e) => e.kind === 'catalog') ? (
          <CollapsibleGroup
            id="catalogs"
            label={nav('catalogsSection')}
            defaultOpen={activeGroup === 'catalogs'}
          >
            <SidebarMenu>
              {visibleNav
                .filter(
                  (e) => e.kind === 'catalog' && e.id !== 'platform.currency' && !e.sidebarHidden,
                )
                .map((entry) => {
                  const label = entry.label[locale] ?? entry.label.en ?? entry.name;
                  const count = counts?.[entry.id] ?? 0;
                  const Icon = resolveIcon(entry.icon, entry.kind);
                  return (
                    <SidebarMenuItem key={entry.id}>
                      <SidebarMenuButton
                        tooltip={label}
                        isActive={isActive(entry.href)}
                        render={<NavLink href={entry.href} />}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                      {count > 0 && (
                        <SidebarMenuBadge aria-label={nav('recordCount', { count })}>
                          {count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </CollapsibleGroup>
        ) : null}
        {visibleNav.some((e) => e.kind === 'document') ? (
          <CollapsibleGroup
            id="documents"
            label={nav('documentsSection')}
            defaultOpen={activeGroup === 'documents'}
          >
            <SidebarMenu>
              {visibleNav
                .filter((e) => e.kind === 'document')
                .map((entry) => {
                  const label = entry.label[locale] ?? entry.label.en ?? entry.name;
                  const count = counts?.[entry.id] ?? 0;
                  const Icon = resolveIcon(entry.icon, entry.kind);
                  return (
                    <SidebarMenuItem key={entry.id}>
                      <SidebarMenuButton
                        tooltip={label}
                        isActive={isActive(entry.href)}
                        render={<NavLink href={entry.href} />}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                      {count > 0 && (
                        <SidebarMenuBadge aria-label={nav('recordCount', { count })}>
                          {count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </CollapsibleGroup>
        ) : null}
        {visibleNav.some((e) => e.kind === 'register') ? (
          <CollapsibleGroup
            id="registers"
            label={nav('registersSection')}
            defaultOpen={activeGroup === 'registers'}
          >
            <SidebarMenu>
              {visibleNav
                .filter((e) => e.kind === 'register')
                .map((entry) => {
                  const label = entry.label[locale] ?? entry.label.en ?? entry.name;
                  const Icon = resolveIcon(entry.icon, entry.kind);
                  return (
                    <SidebarMenuItem key={entry.id}>
                      <SidebarMenuButton
                        tooltip={label}
                        isActive={isActive(entry.href)}
                        render={<NavLink href={entry.href} />}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </CollapsibleGroup>
        ) : null}
        <CollapsibleGroup
          id="reports"
          label={nav('reportsSection')}
          defaultOpen={activeGroup === 'reports'}
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={nav('reportsSection')}
                isActive={isActive('/reports')}
                render={<NavLink href="/reports" />}
              >
                <BarChart3 />
                <span>{nav('reportsSection')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </CollapsibleGroup>
        {enabledAddons && enabledAddons.length > 0 ? (
          <CollapsibleGroup
            id="addons"
            label={nav('addonsSection')}
            defaultOpen={activeGroup === 'addons'}
          >
            <SidebarMenu>
              {enabledAddons.map((key) => {
                const entry = ADDON_CATALOG[key];
                if (!entry) return null;
                const Icon = ADDON_ICONS[entry.iconKey] ?? Puzzle;
                const labels = getAddonLabels(key, locale);
                return (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton
                      tooltip={labels.title}
                      isActive={isActive(entry.navHref)}
                      render={<NavLink href={entry.navHref} />}
                    >
                      <Icon />
                      <span>{labels.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </CollapsibleGroup>
        ) : null}
        {hasAdmin && adminLinks ? (
          <CollapsibleGroup
            id="admin"
            label={nav('adminSection')}
            defaultOpen={activeGroup === 'admin'}
          >
            <SidebarMenu>
              {adminLinks.roles && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminRoles')}
                    isActive={isActive('/admin/roles')}
                    render={<NavLink href="/admin/roles" />}
                  >
                    <ShieldCheck />
                    <span>{nav('adminRoles')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.members && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminMembers')}
                    isActive={isActive('/admin/members')}
                    render={<NavLink href="/admin/members" />}
                  >
                    <UserCog />
                    <span>{nav('adminMembers')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.import && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('importData')}
                    isActive={isActive('/admin/import')}
                    render={<NavLink href="/admin/import" />}
                  >
                    <Upload />
                    <span>{nav('importData')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.audit && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminAudit')}
                    isActive={isActive('/admin/audit')}
                    render={<NavLink href="/admin/audit" />}
                  >
                    <ScrollText />
                    <span>{nav('adminAudit')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.mobileFeatures && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminMobileFeatures')}
                    isActive={isActive('/admin/mobile-features')}
                    render={<NavLink href="/admin/mobile-features" />}
                  >
                    <Smartphone />
                    <span>{nav('adminMobileFeatures')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.periodClose && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminPeriodClose')}
                    isActive={isActive('/admin/period-close')}
                    render={<NavLink href="/admin/period-close" />}
                  >
                    <Lock />
                    <span>{nav('adminPeriodClose')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.fxRates && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminFxRates')}
                    isActive={isActive('/admin/fx-rates')}
                    render={<NavLink href="/admin/fx-rates" />}
                  >
                    <ArrowLeftRight />
                    <span>{nav('adminFxRates')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.billing && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminBilling')}
                    isActive={isActive('/admin/billing')}
                    render={<NavLink href="/admin/billing" />}
                  >
                    <CreditCard />
                    <span>{nav('adminBilling')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.apiKeys && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminApiKeys')}
                    isActive={isActive('/admin/api-keys')}
                    render={<NavLink href="/admin/api-keys" />}
                  >
                    <Key />
                    <span>{nav('adminApiKeys')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.danger && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminDanger')}
                    isActive={isActive('/admin/danger')}
                    render={<NavLink href="/admin/danger" />}
                  >
                    <AlertTriangle />
                    <span>{nav('adminDanger')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {adminLinks.branding && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('adminBranding')}
                    isActive={isActive('/admin/branding')}
                    render={<NavLink href="/admin/branding" />}
                  >
                    <Palette />
                    <span>{nav('adminBranding')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </CollapsibleGroup>
        ) : null}
        {permissions && hasPermission(permissions, 'admin.organization:edit') ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={nav('settings')}
                    isActive={isActive('/settings')}
                    render={<NavLink href="/settings" />}
                  >
                    <Settings />
                    <span>{nav('settings')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </SidebarPrimitive>
  );
}
