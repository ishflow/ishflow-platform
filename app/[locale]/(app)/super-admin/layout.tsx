import { SaShell } from '@/components/v2/super-admin/shell/sa-shell';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import type { ReactNode } from 'react';

// Force dynamic rendering: same constraint as the V2 root layout — the
// super-admin shell reads pathname-derived active state and a per-request
// operator context.
export const dynamic = 'force-dynamic';

/**
 * V2 super-admin layout — operator console shell wrapper.
 *
 * Wraps `/super-admin/**` in the `sa-shell` (rail + panel + main). The
 * outer `.v2-app` wrapper and variant-9 CSS scope are provided by the parent
 * `/layout.tsx`, so this layout intentionally does NOT re-import
 * `v2-globals.css`.
 *
 * AUTH GATE: `assertSuperAdmin()` hard-404s any viewer who is not a platform
 * operator (mirrors the V1 `app/super-admin/layout.tsx` gate). Without this,
 * any authenticated tenant user could open `/super-admin/*` since the parent
 * `(app)/layout.tsx` only enforces sign-in + tenant, not the operator claim.
 *
 * NOTE: the parent `/layout.tsx` renders `<V2Shell>` for all `/*` routes, so
 * this sub-tree double-wraps (V2Shell outside + SaShell inside); the V2Shell
 * chrome is hidden via a CSS `:has(.sa-shell)` rule in `v2-globals.css`.
 */
export default async function SaLayout({ children }: { children: ReactNode }) {
  await assertSuperAdmin();
  // Pending plan-change requests → visible notification badge in the shell.
  // Defensive catch: a query hiccup must never 404 the whole operator console.
  const pendingUpgrades = await withBypass((tx) =>
    tx.upgradeRequest.count({ where: { status: 'pending' } }),
  ).catch(() => 0);
  return <SaShell pendingUpgrades={pendingUpgrades}>{children}</SaShell>;
}
