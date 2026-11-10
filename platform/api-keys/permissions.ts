import { SYSTEM_ROLE_DEFS } from '@/platform/auth/seed-system-roles';
import type { ApiKeyScope } from '@prisma/client';

/**
 * Action verbs that count as "read-like" for the `read` API key scope.
 * Matches the trailing action segment of an `entity:action` permission string.
 */
const READ_ACTIONS = new Set(['read', 'view', 'list']);

/**
 * Action verbs that count as "write-like" for the `write` API key scope.
 * Includes legacy/CRUD forms (`create`/`update`/`delete`) and the canonical
 * `write` action used throughout `SYSTEM_ROLE_DEFS` (see
 * `platform/engine/permissions.ts#derivedCode` which maps create/update → write).
 * `post`/`unpost` cover document posting; `delete` covers hard-delete intents.
 */
const WRITE_ACTIONS = new Set(['create', 'update', 'delete', 'post', 'unpost', 'write']);

/**
 * Permission namespaces that are NEVER granted to API keys, regardless of scope.
 * API keys are an integration surface; they must not manage org/billing/members
 * or hit super-admin surfaces, even if their owner role technically grants those.
 */
const FORBIDDEN_NAMESPACE_PREFIXES = ['admin.', 'super_admin.', 'super-admin.'];

function isForbiddenNamespace(entity: string): boolean {
  for (const prefix of FORBIDDEN_NAMESPACE_PREFIXES) {
    if (entity === prefix.slice(0, -1) || entity.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Build the concrete catalog of permissions known to the system by scanning
 * every role definition and dropping wildcard tokens. The result contains
 * only fully-qualified `entity:action` strings — never `*`, `*:*`, `*:read`,
 * `mod.*:*`, etc. Wildcards are pierced via `hasPermission()` at check time;
 * API keys, however, must hold concrete grants because the bearer dispatch
 * passes the permission set verbatim and we do not want a scope mistake to
 * accidentally grant `*:*` on an org-management surface.
 */
function collectConcretePermissionCatalog(): Set<string> {
  const out = new Set<string>();
  for (const def of Object.values(SYSTEM_ROLE_DEFS)) {
    for (const perm of def.permissions) {
      const [entity, action] = perm.split(':');
      if (!entity || !action) continue;
      // Drop any wildcard form: `*:*`, `*:read`, `mod.*:*`, `entity:*`, etc.
      if (entity === '*' || entity.includes('*') || action === '*') continue;
      out.add(perm);
    }
  }
  return out;
}

/**
 * Maps an API key scope to the permission set it grants on requests.
 *
 * - `read`           → every `*:read` / `*:view` / `*:list` permission in the
 *   system catalog, excluding `admin.*` and `super_admin.*` namespaces.
 * - `write`          → the `read` set ∪ every `*:create` / `*:update` /
 *   `*:delete` / `*:post` / `*:unpost` / `*:write` permission, with the same
 *   admin exclusions.
 * - `platform_admin` → strictly broader than `write`. Returns the same tenant
 *   permission set as `write` (admin/super_admin namespaces are still excluded
 *   from this catalog because they are routed through `isPlatformAdmin(ctx)`
 *   at the call site, not through the per-tenant permission strings). The
 *   distinction matters for `canPerform()` below: only `platform_admin` keys
 *   may invoke MCP super-admin tools, which gate explicitly on the scope rank.
 *
 * Tenant-admin / org-management permissions (`admin.*`, `super_admin.*`) are
 * always excluded — API keys cannot manage org settings, members, billing,
 * audit, or any other admin surface via tenant permission strings, regardless
 * of scope. Platform-admin tools enforce access via a separate scope check.
 *
 * Returns a fresh `Set` on every call so callers can mutate without bleed.
 */
export function scopeToPermissions(scope: ApiKeyScope): Set<string> {
  const catalog = collectConcretePermissionCatalog();
  const allowReadActions = true;
  const allowWriteActions = scope === 'write' || scope === 'platform_admin';

  const out = new Set<string>();
  for (const perm of catalog) {
    const [entity, action] = perm.split(':');
    if (!entity || !action) continue;
    if (isForbiddenNamespace(entity)) continue;

    if (allowReadActions && READ_ACTIONS.has(action)) {
      out.add(perm);
      continue;
    }
    if (allowWriteActions && WRITE_ACTIONS.has(action)) {
      out.add(perm);
    }
  }
  return out;
}

/**
 * Rank lattice for the `ApiKeyScope` enum. Higher rank ⇒ broader access.
 *
 * Used by `canPerform()` to decide whether a key holding scope X can satisfy
 * a requirement of scope Y. Strictly `RANK[keyScope] >= RANK[requiredScope]`.
 *
 * This is the access-control primitive the MCP server uses to gate
 * super-admin tools — only keys with the `platform_admin` rank may invoke
 * them.
 */
const SCOPE_RANK: Record<ApiKeyScope, number> = {
  read: 1,
  write: 2,
  platform_admin: 3,
};

/**
 * Returns true when an API key with `keyScope` is allowed to perform an
 * operation requiring `requiredScope`. Strictly rank-based — a higher key
 * scope subsumes lower required scopes (e.g. `write` ⇒ `read`,
 * `platform_admin` ⇒ `write` ⇒ `read`).
 */
export function canPerform(keyScope: ApiKeyScope, requiredScope: ApiKeyScope): boolean {
  return SCOPE_RANK[keyScope] >= SCOPE_RANK[requiredScope];
}
