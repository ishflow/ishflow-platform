'use client';

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
import {
  Building2,
  CreditCard,
  History,
  LayoutDashboard,
  type LucideIcon,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type ItemKey = 'dashboard' | 'tenants' | 'users' | 'billing' | 'revenue' | 'audit';

const ITEMS: ReadonlyArray<{ href: string; key: ItemKey; icon: LucideIcon }> = [
  { href: '/super-admin', key: 'dashboard', icon: LayoutDashboard },
  { href: '/super-admin/tenants', key: 'tenants', icon: Building2 },
  { href: '/super-admin/users', key: 'users', icon: Users },
  { href: '/super-admin/billing', key: 'billing', icon: CreditCard },
  { href: '/super-admin/revenue', key: 'revenue', icon: TrendingUp },
  { href: '/super-admin/audit', key: 'audit', icon: History },
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => {
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
      </SidebarContent>
      <SidebarFooter>
        <span className="text-muted-foreground px-2 py-1 text-xs">{dict.footer}</span>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}

export { SuperAdminSidebar as Nav };
