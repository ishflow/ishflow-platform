'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { TabShell } from './tab-shell';
import { TabsProvider } from './tabs-context';
import { useTabsOptional } from './use-tabs';

/** Outer provider: wraps the whole sidebar + inset so Sidebar can call useTabs. */
export function TabsProviderRoot({
  userId,
  tenantId,
  enabled,
  children,
}: {
  userId: string;
  tenantId: string;
  enabled: boolean;
  children: ReactNode;
}) {
  // Memoize so TabsProvider's effects don't re-fire on every parent render
  // (object identity would flip otherwise).
  const scope = useMemo(() => ({ userId, tenantId }), [userId, tenantId]);
  if (!enabled) return <>{children}</>;
  return (
    <TabsProvider scope={scope}>
      <NavigationDeselectSync />
      {children}
    </TabsProvider>
  );
}

/**
 * Any browser navigation (sidebar click, router.push, etc.) deselects the
 * active tab so the new page content becomes visible beneath the (still-open)
 * tab chips. The tab chip remains in the bar — the user can reselect it to
 * resume work.
 *
 * Skips the first render so the hydrate effect's restored activeId isn't
 * clobbered when the app mounts.
 */
function NavigationDeselectSync() {
  const pathname = usePathname();
  const tabs = useTabsOptional();
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevRef.current === null) {
      prevRef.current = pathname;
      return;
    }
    if (prevRef.current === pathname) return;
    prevRef.current = pathname;
    tabs?.deselect();
  }, [pathname, tabs]);
  return null;
}

/** Content slot: renders the TabShell (desktop) or the plain children (mobile / flag off). */
export function TabsContentSlot({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <>
      <div className="hidden min-h-0 min-w-0 flex-1 md:flex md:flex-col">
        <TabShell>{children}</TabShell>
      </div>
      <div className="min-h-0 flex-1 md:hidden">{children}</div>
    </>
  );
}
