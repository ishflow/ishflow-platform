import { loadEnabledAddons } from '@/platform/addons';
import { verifyApiKey } from '@/platform/api-keys/hash';
import { scopeToPermissions } from '@/platform/api-keys/permissions';
import { withBypass } from '@/platform/db/tenant-context';
import type { AppContext, RoleScopeGroup } from './current-context';

const KEY_PREFIX_TAG = '1ca_live_';
const KEY_LENGTH = 41;
const PREFIX_LOOKUP_LENGTH = 16;
const LAST_USED_DEBOUNCE_MS = 60_000;

/**
 * Thrown for tenant-level API-key failures the caller (bearer dispatcher)
 * must surface verbatim, e.g. 402 `feature_locked` when the tenant's plan
 * lacks `apiAccess`. The resolver itself stays pure — feature gating is
 * applied higher up (see T2.1). Reserved for future use; the current
 * implementation only returns `null` or a valid AppContext.
 */
export class ApiKeyAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiKeyAuthError';
  }
}

/**
 * Resolves an API-key bearer token to an AppContext.
 *
 * Returns `null` when:
 *   - the token doesn't match the `1ca_live_` format/length,
 *   - no non-revoked row exists with the matching key_prefix, or
 *   - bcrypt.compare fails against every candidate.
 *
 * Successful resolution builds a synthetic AppContext: the creating user
 * becomes `ctx.user` (for audit attribution), permissions are derived from
 * the key's scope, and `membership` is `null` — API keys are NOT tied to a
 * Membership row.
 *
 * `lastUsedAt` is refreshed at most once per minute using a SQL WHERE-clause
 * guard so concurrent requests don't thrash the row. Update failures are
 * swallowed — observability never blocks authentication.
 */
export async function resolveApiKeyContext(rawKey: string): Promise<AppContext | null> {
  // 1. Format guard — cheap, before any DB hit.
  if (!rawKey.startsWith(KEY_PREFIX_TAG) || rawKey.length !== KEY_LENGTH) {
    return null;
  }

  const prefix = rawKey.slice(0, PREFIX_LOOKUP_LENGTH);

  // 2. Prefix lookup. keyPrefix is @unique in the schema, but findMany keeps
  //    the code resilient if that constraint is ever relaxed (multiple keys
  //    sharing a prefix would be matched independently via bcrypt below).
  const candidates = await withBypass((tx) =>
    tx.apiKey.findMany({
      where: { keyPrefix: prefix, revokedAt: null },
      include: { tenant: true, createdBy: true },
    }),
  );

  // 3. Match loop — constant-time across the candidate set via bcrypt.compare.
  const now = new Date();
  for (const candidate of candidates) {
    const ok = await verifyApiKey(rawKey, candidate.keyHash);
    if (!ok) continue;

    // 3a. Expiry guard — an expired key is treated exactly like an unknown
    //     key (skip → resolver returns null → bearer dispatcher surfaces
    //     `invalid_api_key`). Keys with no expiry never expire.
    if (candidate.expiresAt && candidate.expiresAt < now) {
      continue;
    }

    // 4. Debounced lastUsedAt update — WHERE-clause guard avoids races.
    const oneMinAgo = new Date(Date.now() - LAST_USED_DEBOUNCE_MS);
    if (!candidate.lastUsedAt || candidate.lastUsedAt < oneMinAgo) {
      await withBypass((tx) =>
        tx.apiKey.updateMany({
          where: {
            id: candidate.id,
            OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: oneMinAgo } }],
          },
          data: { lastUsedAt: new Date() },
        }),
      ).catch(() => {
        // lastUsedAt is observability metadata — never block auth on it.
      });
    }

    // 5. Build AppContext. Synthetic — no Membership row, empty per-entity
    //    scopes (API keys see the full tenant subject to scope-level perms).
    const permissions = scopeToPermissions(candidate.scope);
    const scopesByEntity = new Map<string, RoleScopeGroup[]>();
    const addons = await loadEnabledAddons(candidate.tenant.id);

    return {
      user: candidate.createdBy,
      tenant: candidate.tenant,
      membership: null,
      permissions,
      scopesByEntity,
      addons,
      apiKey: { id: candidate.id, scope: candidate.scope },
    };
  }

  return null;
}
