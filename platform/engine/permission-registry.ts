import { getRegistry } from '@/platform/metadata';

export const SYSTEM_PERMISSIONS = [
  'admin.roles:manage',
  'admin.members:manage',
  'admin.audit:read',
  'admin.billing:manage',
  'admin.settings:manage',
  'admin.mobile:manage',
  'demo:import',
  'owner:tenant_archive',
  'owner:tenant_delete',
  'owner:tenant_transfer',
  'owner:branding',
  'owner:legal_name_edit',
  'owner:remove_admin',
  'owner:assign_owner_role',
  'owner:export_full',
] as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[number];

/**
 * Return the complete set of permission codes the app knows about:
 * SYSTEM_PERMISSIONS (admin, demo) ∪ every registered entity's CRUD +
 * posting actions.
 *
 * Catalog configs emit `:read / :write / :delete`.
 * Document configs additionally emit `:post / :unpost`.
 *
 * Sorted alphabetically so the admin UI can render them deterministically.
 */
export function listAllPermissions(): string[] {
  const out = new Set<string>(SYSTEM_PERMISSIONS);
  const reg = getRegistry();
  for (const cfg of Object.values(reg.catalog)) {
    out.add(`${cfg.id}:read`);
    out.add(`${cfg.id}:write`);
    out.add(`${cfg.id}:delete`);
  }
  for (const cfg of Object.values(reg.document)) {
    out.add(`${cfg.id}:read`);
    out.add(`${cfg.id}:write`);
    out.add(`${cfg.id}:delete`);
    out.add(`${cfg.id}:post`);
    out.add(`${cfg.id}:unpost`);
  }
  return [...out].sort();
}
