'use client';

/**
 * Super Admin sidebar — 10 nav items grouped into Console / Growth / Platform.
 *
 * Pages for the new items (analytics, communications, marketing, system)
 * may not yet exist; their links still render so the chrome is future-proof
 * and other workstreams can fill in the routes incrementally.
 *
 * `support` is intentionally omitted: the `SupportTicket` table has no
 * producer yet, so the route redirects to the dashboard until an in-app
 * ticket-creation path exists (see `app/super-admin/support/page.tsx`).
 *
 * Renders the brand header, the grouped nav, and the footer chrome. Mounted
 * by `app/super-admin/layout.tsx`.
 */

import {
  BarChart3,
  Building2,
  CreditCard,
  History,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  MessageSquare,
  Server,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar as SidebarPrimitive,
} from '@/components/ui/sidebar';
import type { SuperAdminDict } from '@/platform/super-admin/dict';

type ItemKey =
  | 'dashboard'
  | 'tenants'
  | 'users'
  | 'audit'
  | 'analytics'
  | 'revenue'
  | 'billing'
  | 'communications'
  | 'marketing'
  | 'system'
  | 'support';

interface NavItem {
  readonly href: string;
  readonly key: ItemKey;
  readonly icon: LucideIcon;
}

interface NavGroup {
  readonly id: 'console' | 'growth' | 'platform';
  readonly items: ReadonlyArray<NavItem>;
}

/**
 * Three logical groups, rendered as separate `SidebarGroup` blocks so the
 * visual rhythm matches the spec's "Console / Growth / Platform" mental
 * model. The labels themselves are intentionally not surfaced — the icon +
 * spacing is enough; adding group labels would clutter the collapsed-icon
 * mode.
 */
const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    id: 'console',
    items: [
      { href: '/super-admin', key: 'dashboard', icon: LayoutDashboard },
      { href: '/super-admin/tenants', key: 'tenants', icon: Building2 },
      { href: '/super-admin/users', key: 'users', icon: Users },
      { href: '/super-admin/audit', key: 'audit', icon: History },
    ],
  },
  {
    id: 'growth',
    items: [
      { href: '/super-admin/analytics', key: 'analytics', icon: BarChart3 },
      { href: '/super-admin/revenue', key: 'revenue', icon: TrendingUp },
      { href: '/super-admin/billing', key: 'billing', icon: CreditCard },
      {
        href: '/super-admin/communications',
        key: 'communications',
        icon: MessageSquare,
      },
      { href: '/super-admin/marketing', key: 'marketing', icon: Megaphone },
    ],
  },
  {
    id: 'platform',
    items: [{ href: '/super-admin/system', key: 'system', icon: Server }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/super-admin') return pathname === '/super-admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SuperAdminSidebar({ dict }: { dict: SuperAdminDict['nav'] }) {
  const pathname = usePathname() ?? '';

  return (
    <SidebarPrimitive collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default" tooltip={dict.brand}>
              <LayoutDashboard />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">{dict.brand}</span>
                <span className="text-muted-foreground text-xs">{dict.subtitle}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  const label = dict.items[item.key];
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        tooltip={label}
                        isActive={active}
                        render={<Link href={item.href} />}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <span className="text-muted-foreground px-2 py-1 text-xs">{dict.footer}</span>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
