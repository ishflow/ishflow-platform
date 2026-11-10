import type { AppContext } from '@/platform/auth/current-context';
import type { CatalogConfig, DocumentConfig } from '@/platform/metadata';
import { PermissionDeniedError } from './errors';

export type Op = 'read' | 'create' | 'update' | 'delete' | 'post' | 'unpost';

type AnyConfig = CatalogConfig | DocumentConfig;

export const SEALED_NAMESPACES = [
  'owner',
  'admin.billing',
  'admin.organization',
  // Audit is sealed so a read-everything wildcard (`viewer`'s `*:read`) can't
  // surface the audit log in the nav. owner/admin/chief_accountant hold an
  // explicit `admin.audit:read`. (Members/FX/period are NOT sealed — owner's
  // `*:*` reaches them.)
  'admin.audit',
  'reports',
] as const;

export function check(ctx: AppContext, config: AnyConfig, op: Op): void {
  const rule = ruleFor(config, op);
  if (rule === 'none') throw new PermissionDeniedError(config.id, op);
  if (rule === 'any') return;
  const required = derivedCode(config, op);
  if (!hasPermission(ctx.permissions, required)) {
    throw new PermissionDeniedError(config.id, op);
  }
}

/**
 * Non-throwing companion to {@link check} — returns whether `ctx` may perform
 * `op` on `config`. Used by the UI shells to gate affordances (hide the "New"
 * button, render a record read-only) so a user never sees an action that the
 * engine would reject with `PermissionDeniedError`.
 */
export function can(ctx: AppContext, config: AnyConfig, op: Op): boolean {
  const rule = ruleFor(config, op);
  if (rule === 'none') return false;
  if (rule === 'any') return true;
  return hasPermission(ctx.permissions, derivedCode(config, op));
}

export function derivedCode(config: AnyConfig, op: Op): string {
  const action = op === 'create' || op === 'update' ? 'write' : op;
  return `${config.id}:${action}`;
}

export function hasPermission(granted: Set<string>, required: string): boolean {
  if (granted.has(required)) return true;
  const [entity, action] = required.split(':');
  if (!entity || !action) return false;
  const mod = entity.split('.')[0] ?? '';
  const candidates = [`${entity}:*`, `${mod}.*:${action}`, `${mod}.*:*`, `*:${action}`, '*:*'];
  for (const pat of candidates) {
    if (granted.has(pat)) {
      // Sealed namespaces: any wildcard with a `*` in its entity portion
      // must NOT pierce. Explicit-entity grants (entity:* or full match)
      // are still honored.
      const [patEntity] = pat.split(':');
      const entityHasWildcard = patEntity === '*' || patEntity?.includes('.*');
      if (entityHasWildcard) {
        const requiredNs = required.split(':')[0] ?? '';
        const sealed = SEALED_NAMESPACES.some(
          (ns) => requiredNs === ns || requiredNs.startsWith(`${ns}.`),
        );
        if (sealed) {
          continue; // try next candidate, skip this pierce
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Assert that the current user has a specific permission.
 * Use at the top of protected pages; on missing permission returns `false`
 * so the caller can `notFound()` or redirect.
 */
export function assertCan(ctx: AppContext, permission: string): boolean {
  return hasPermission(ctx.permissions, permission);
}

function ruleFor(config: AnyConfig, op: Op): 'any' | 'none' | undefined {
  const p = config.permissions as Record<string, unknown>;
  let raw: unknown;
  switch (op) {
    case 'read':
      raw = p.read;
      break;
    case 'create':
    case 'update':
      raw = p.write;
      break;
    case 'delete':
      raw = p.delete;
      break;
    case 'post':
      raw = p.post;
      break;
    case 'unpost':
      raw = p.unpost;
      break;
  }
  if (raw === 'any' || raw === 'none') return raw;
  return undefined;
}
