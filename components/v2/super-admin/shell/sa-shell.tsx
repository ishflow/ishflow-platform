import type { ReactNode } from 'react';
import { SaPanel } from './sa-panel';
import { SaRail } from './sa-rail';

/**
 * Super-admin three-column shell — operator console.
 *
 * Renders rail + panel + main, matching the sa-* mockup structure. Topbar is
 * NOT rendered here — each sa- page renders its own `<SaTopbar>` so the
 * breadcrumb/title can be page-specific.
 *
 * NOTE: This shell uses the same `.app/.rail/.panel/.main` classnames as
 * V2Shell because variant-9 CSS scopes selectors under `.v2-app`. The parent
 * `/layout.tsx` (stream-A) currently wraps every `/*` child in V2Shell
 * — the integration phase will deconflict that wrapping so the sa-shell
 * fully replaces (rather than nests inside) the tenant V2Shell. Until then,
 * the components are functionally correct and visually parity-tested
 * standalone.
 */
/**
 * Inline style block: hide the customer-facing V2Shell chrome (rail + panel +
 * tabs) when an SaShell is nested inside it. SaShell is rendered AS A CHILD
 * of V2Shell's `<main>`, not as a sibling, because Next.js layouts compose
 * (V2Layout > SaLayout > page). So we use `:has()` to target V2Shell's
 * `.app` ancestor, then hide its direct chrome children.
 *
 * This is a workaround for the known turbopack-dev limitation where
 * `x-pathname` from middleware is unreliable inside server-rendered layouts
 * (see V2Shell's V2PanelSwitcher comment), which prevents a route-level
 * `if (isSuperAdminPath)` skip from firing consistently.
 */
const SUPPRESS_V2SHELL_CSS = `
.app:has(.sa-shell) > aside.rail,
.app:has(.sa-shell) > aside.panel { display: none !important; }
.app:has(.sa-shell) > main > nav.tabs { display: none !important; }
.app:has(.sa-shell) > main { padding: 0 !important; grid-column: 1 / -1 !important; }
.app:has(.sa-shell) { grid-template-columns: 1fr !important; }
`;

export function SaShell({
  children,
  pendingUpgrades = 0,
}: {
  children: ReactNode;
  pendingUpgrades?: number;
}) {
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, server-only CSS */}
      <style dangerouslySetInnerHTML={{ __html: SUPPRESS_V2SHELL_CSS }} />
      <div className="app sa-shell">
        <SaRail pendingUpgrades={pendingUpgrades} />
        <SaPanel pendingUpgrades={pendingUpgrades} />
        <main className="main">{children}</main>
      </div>
    </>
  );
}
