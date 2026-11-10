// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
        clear: () => {
          store.clear();
        },
      },
    });
  }
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      dashboard: 'Dashboard',
      catalogs: 'Catalogs',
      documents: 'Documents',
      registers: 'Registers',
      settings: 'Settings',
      appName: 'ishflow',
      platform: 'Platform',
      catalogsSection: 'Catalogs',
    };
    return map[key] ?? key;
  },
  useLocale: () => 'en',
}));

vi.mock('@/platform/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/dashboard',
}));

import { TabsProvider } from '@/components/app/tabs/tabs-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './sidebar';

function renderSidebar() {
  return render(
    <SidebarProvider>
      <Sidebar />
    </SidebarProvider>,
  );
}

function renderSidebarWithActiveTab(href: string, title = 'Test') {
  // Pre-seed localStorage so TabsProvider's post-mount hydrate effect picks
  // up the active tab. Pushing it from a child via openOrFocus would race
  // the hydrate effect (which fires after child effects → wipes the tab).
  const tabId = 'test-tab-id';
  const seeded = {
    version: 1,
    tabs: [
      {
        id: tabId,
        href,
        title,
        dirty: false,
        pinned: false,
        openedAt: Date.now(),
        lastActiveAt: Date.now(),
      },
    ],
    activeId: tabId,
  };
  window.localStorage.setItem('tabs:u1:t1', JSON.stringify(seeded));
  return render(
    <TabsProvider scope={{ userId: 'u1', tenantId: 't1' }}>
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>
    </TabsProvider>,
  );
}

describe('platform Sidebar', () => {
  it('renders within shadcn SidebarProvider using data-slot="sidebar"', () => {
    const { container } = renderSidebar();
    expect(container.querySelector('[data-slot="sidebar"]')).not.toBeNull();
  });

  it('uses shadcn SidebarMenu primitive (data-slot="sidebar-menu")', () => {
    const { container } = renderSidebar();
    expect(container.querySelector('[data-slot="sidebar-menu"]')).not.toBeNull();
  });

  it('renders the Dashboard nav link pointing to /dashboard', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: /dashboard/i });
    expect(link.getAttribute('href')).toBe('/dashboard');
  });

  it('renders a menu item for each generated nav entry', async () => {
    const { navManifest } = await import('@/lib/generated/nav');
    // Open every collapsible group so every manifest entry is in the DOM.
    for (const id of ['catalogs', 'documents', 'registers', 'reports', 'admin']) {
      window.localStorage.setItem(`sidebar:group:${id}`, '1');
    }
    renderSidebar();
    // Sprint 32 split the merged /counterparties list into its two
    // constituent catalogs; every navManifest entry is now surfaced
    // except `platform.currency` (managed from catalogs list instead)
    // and any entry that opts out via the metadata DSL's `sidebarHidden`
    // flag (currently `inventory.product_category` + `_group`, which
    // are reachable inline from the product create form).
    for (const entry of navManifest) {
      if (entry.id === 'platform.currency') continue;
      if (entry.sidebarHidden) continue;
      const linkName = entry.label.en;
      expect(linkName).toBeTruthy();
      // Find by exact text match first; fall back to regex if no exact match.
      // Regex matching can produce false positives when one label is a substring
      // of another (e.g. "Sales" vs "Sales Invoice").
      const allLinks = screen.getAllByRole('link');
      const exactLinks = allLinks.filter((el) => el.textContent?.trim() === linkName);
      const link =
        exactLinks.length === 1
          ? exactLinks[0]
          : allLinks.find((el) => el.getAttribute('href') === entry.href);
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toBe(entry.href);
    }
  });

  it('renders Platform and Catalogs group labels', () => {
    renderSidebar();
    expect(screen.getByText('Platform')).not.toBeNull();
    // Two "Catalogs" in DOM: the group label, and (from existing) potentially a disabled nav item.
    // Here we added a group label named "Catalogs" — assert it appears at least once.
    expect(screen.getAllByText('Catalogs').length).toBeGreaterThanOrEqual(1);
  });

  it("highlights the active tab's section instead of the pathname when a tab is active", async () => {
    // pathname mock is /en/dashboard — without an active tab Dashboard is
    // highlighted. Open a catalog-detail tab → that should override.
    // Open every collapsible group so the catalogs entries are in the DOM.
    for (const id of ['catalogs', 'documents', 'registers', 'reports', 'admin']) {
      window.localStorage.setItem(`sidebar:group:${id}`, '1');
    }
    const { navManifest } = await import('@/lib/generated/nav');
    const catalog = navManifest.find((e) => e.kind === 'catalog');
    expect(catalog).toBeTruthy();
    if (!catalog) return;

    renderSidebarWithActiveTab(`${catalog.href}/abc`);

    // base-ui's useRender emits `data-active=""` on the active rendered
    // element (no value — its presence is what matters). Inactive elements
    // have no `data-active` attribute at all.
    await waitFor(() => {
      const allLinks = screen.getAllByRole('link');
      const target = allLinks.find((el) => el.getAttribute('href') === catalog.href);
      expect(target?.hasAttribute('data-active')).toBe(true);
    });

    // Dashboard link should NOT be highlighted (pathname says /dashboard but
    // active tab overrides).
    const dashLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashLink.hasAttribute('data-active')).toBe(false);
  });
});
