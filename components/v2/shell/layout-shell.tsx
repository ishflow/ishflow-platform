import { buildNavForPermissions } from '@/lib/v2-shell/build-nav';
import { resolveContext } from '@/platform/auth/current-context';
import { loadEnabledFeatures } from '@/platform/features/load-enabled-features';
import type { ReactNode } from 'react';
import { V2CatalogNav } from './catalog-nav';
import { V2CommandPaletteMount } from './command-palette-mount';
import { V2DocumentListPanel } from './document-list-panel';
import { V2Panel } from './panel';
import { V2PanelSwitcher } from './panel-switcher';
import { V2Rail } from './rail';
import { V2RecordListPanel } from './record-list-panel';
import { V2Tabs } from './tabs';

/**
 * V2 root shell — three-column variant-9 layout.
 *
 * The rail + section panel are filtered to the signed-in user's permissions by
 * `buildNavForPermissions` (a role only sees rails/sections it may use). The
 * middle panel branches via a client-side `V2PanelSwitcher` (the `x-pathname`
 * middleware override header was unreliable in Next.js 16 dev with turbopack).
 *
 * Topbar is NOT rendered here — each page renders its own `<V2Topbar>`.
 */
export async function V2Shell({ children }: { children: ReactNode }) {
  const ctx = await resolveContext();
  const enabledFeatures = await loadEnabledFeatures();
  const { rails, panels } = buildNavForPermissions(ctx?.permissions ?? new Set(), enabledFeatures);
  // Project to serializable primitives — RailDef/PanelItem carry icon
  // components that can't cross the server→client boundary. Each rail's href is
  // its first *visible* item so clicking a rail never lands on a hidden page.
  const railLinks = rails.map((r) => ({
    key: r.key,
    href: panels[r.key]?.[0]?.items[0]?.href ?? r.href,
  }));
  // Flatten one level of nesting: a parent item (e.g. the Turnover group) is a
  // redirect, so the panel allow-list must carry both the parent href and each
  // surviving child href. `panels` is already permission-filtered by
  // `buildNavForPermissions`, so absent children never reach here.
  const itemHrefs = Object.values(panels)
    .flat()
    .flatMap((section) =>
      section.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]),
    );

  return (
    <div className="app">
      <V2Rail railLinks={railLinks} />
      <V2PanelSwitcher
        defaultPanel={<V2Panel itemHrefs={itemHrefs} />}
        catalogNavPanel={<V2CatalogNav />}
        recordListPanel={<V2RecordListPanel />}
        documentListPanel={<V2DocumentListPanel />}
      />
      <main className="main">
        <V2Tabs />
        {children}
      </main>
      <V2CommandPaletteMount />
    </div>
  );
}
