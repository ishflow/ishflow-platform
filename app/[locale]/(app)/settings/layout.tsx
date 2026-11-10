import '@/components/v2/settings/_settings.css';
import { resolveContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Workspace settings are admin-only. `admin.organization:edit` (owner/admin)
 * gates the whole `/settings/*` subtree; roles without it (chief_accountant,
 * bookkeeper, viewer, …) get a 404 — defense-in-depth behind the hidden nav.
 * Per-surface owner-only gates (e.g. billing) live on their pages.
 */
export default async function V2SettingsLayout({ children }: { children: ReactNode }) {
  const ctx = await resolveContext();
  if (ctx?.tenant && !hasPermission(ctx.permissions, 'admin.organization:edit')) {
    notFound();
  }
  return <>{children}</>;
}
