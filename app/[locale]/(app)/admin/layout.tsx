import './admin.css';
import { resolveContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

// Any of these makes a user an "admin" for the purposes of reaching /admin/*.
// owner/admin hold them via `*:*`; chief_accountant via audit/fx/period/
// currency. Roles with none (viewer, bookkeeper, cashier, sales, buyer,
// warehouse) get a 404 on every admin route — defense-in-depth behind the nav.
const ANY_ADMIN_PERMISSION = [
  'admin.members:manage',
  'admin.audit:read',
  'admin.period:manage',
  'admin.organization:edit',
];

/**
 * V2 admin route subtree layout. Loads `admin.css` (scoped variant-9 classes)
 * AND gates the whole `/admin/*` subtree: a tenant user without any admin
 * permission is 404'd. Per-page gates (members/roles → `admin.members:manage`)
 * further restrict pages a partial-admin (e.g. chief_accountant) can't use.
 */
export default async function V2AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await resolveContext();
  if (ctx?.tenant && !ANY_ADMIN_PERMISSION.some((p) => hasPermission(ctx.permissions, p))) {
    notFound();
  }
  return <>{children}</>;
}
