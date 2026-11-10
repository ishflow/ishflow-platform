/**
 * User super-admin tools — hand-written MCP wrappers around
 * `platform/super-admin/search-users.ts`, `platform/super-admin/user-detail/*`,
 * `platform/auth/delete-account.ts`, and `platform/api-keys/generate.ts`.
 *
 * All 6 tools require ApiKeyScope `platform_admin`. The MCP route's auth
 * floor is `read`; per-tool scope is enforced inside `dispatchTool` via
 * `requiredScope`. A read or write key naming any of these tools is
 * rejected with `forbidden` before the handler runs.
 *
 * Audit pattern — same dual-row model as `tenant-tools.ts`:
 *   - The engine action writes a canonical PlatformAuditLog row inside its
 *     own `withBypass` tx when one exists (`deleteUserAccount` is the
 *     exception — it does not author its own audit row, so the channel
 *     audit row written here is the only trace).
 *   - This wrapper layers a SECOND PlatformAuditLog row with a `mcp.user.*`
 *     action prefix and `source: 'mcp'` so the SA audit dashboard can
 *     attribute the change to the MCP delivery channel.
 *   - `ctx.correlationId` is embedded in the channel row's `after` JSON for
 *     cross-channel investigation.
 *
 * Deferred tools (Phase 2):
 *   - `user_request_password_reset` — needs `clerk.signInTokens.createSignInToken`
 *     which lives in `app/super-admin/users/[userId]/actions.ts` as a
 *     `'use server'` action and cannot be imported into a leaf package. A
 *     lightweight `platform/auth/*` helper is out of scope for this task
 *     ("do not modify platform/**"), so the tool is registered but its
 *     handler throws `precondition_failed`. Hook up in Phase 2 when the
 *     Clerk admin actions are extracted to a platform-level module.
 *   - `user_revoke_all_sessions` — same reason; deferred to Phase 2.
 *
 * `user_impersonate_token`: mints a tenant-scoped API key whose `createdBy`
 * is the impersonated user. At resolve time (`platform/auth/resolve-api-key.ts`),
 * the bearer's `ctx.user` will be that user — so downstream engine helpers
 * see the impersonated identity. The SA operator's attribution lives only
 * on the channel audit row (`mcp.user.impersonation_token_minted`) plus the
 * apiKeyId folded into its `after` payload. Phase 2 follow-up: add an
 * `expiresAt` column to `ApiKey` so the mint can honour the requested TTL;
 * for now the key is long-lived and the operator must revoke it via
 * `system_api_key_revoke` after use.
 */
import { generateApiKey } from '@/platform/api-keys/generate';
import { withTenant } from '@/platform/db/tenant-context';
import { deleteUserAccount } from '@/platform/auth/delete-account';
import { searchUsers } from '@/platform/super-admin/search-users';
import { loadUserDetail } from '@/platform/super-admin/user-detail/load-user-detail';
import { z } from 'zod';
import { ToolError } from '../error-map';
import type { ToolDefinition } from '../types';
import { requireActor, writeChannelAudit } from './common';

/* -------------------------------------------------------------------- */
/* Reads (2)                                                            */
/* -------------------------------------------------------------------- */

export const userListTool: ToolDefinition = {
  name: 'user_list',
  description:
    'Search users across all tenants by free-text query (email / first name / last name / exact clerkId). Returns up to 50 rows ordered most-recent first. A trimmed query shorter than 2 chars returns an empty array to prevent full-table scans.',
  inputSchema: z.object({
    search: z.string().min(0).max(200),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    return searchUsers(input.search);
  },
};

export const userGetTool: ToolDefinition = {
  name: 'user_get',
  description:
    'Load the full Super Admin user-detail bundle: identity, memberships (cross-tenant), recent platform audit entries, push tokens, and active Clerk sessions. Returns null if the user id is unknown. Clerk session list is best-effort — sessionsError:true means Clerk was unreachable but the rest is fresh.',
  inputSchema: z.object({
    userId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    return loadUserDetail(input.userId);
  },
};

/* -------------------------------------------------------------------- */
/* Writes (4 — 2 wired, 2 deferred)                                     */
/* -------------------------------------------------------------------- */

export const userSoftDeleteTool: ToolDefinition = {
  name: 'user_soft_delete',
  description:
    'PERMANENT (PII-destructive): soft-delete a user account. Scrubs firstName / lastName / imageUrl, rewrites email to a tombstone (`deleted-<id>@deleted.local`), sets deletedAt, deletes all memberships, and best-effort deletes the Clerk user. Refused with precondition_failed if the user is the sole `owner` of any tenant (transfer ownership first). Requires confirm:"YES" and a free-text reason (min 3 chars) recorded on the channel audit row.',
  inputSchema: z.object({
    userId: z.string().uuid(),
    reason: z.string().min(3).max(500),
    confirm: z.literal('YES'),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    const result = await deleteUserAccount({ userId: input.userId });
    await writeChannelAudit({
      action: 'user.soft_deleted',
      tenantId: null,
      actor,
      details: { targetUserId: input.userId, reason: input.reason },
      ctx,
    });
    return { ok: true, userId: input.userId, deletedAt: result.deletedAt.toISOString() };
  },
};

export const userRequestPasswordResetTool: ToolDefinition = {
  name: 'user_request_password_reset',
  description:
    'Mint a short-lived (15 min) Clerk sign-in token the operator can forward to the user for password recovery. Returns the URL once for copy-paste. DEFERRED to Phase 2 — the Clerk admin helpers currently live in a `use server` action and have not been extracted into a leaf-importable platform module. Calling this tool today returns precondition_failed.',
  inputSchema: z.object({
    userId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async () => {
    throw new ToolError(
      'precondition_failed',
      'user_request_password_reset is deferred to Phase 2 — Clerk admin helpers not yet extracted to platform/',
    );
  },
};

export const userRevokeAllSessionsTool: ToolDefinition = {
  name: 'user_revoke_all_sessions',
  description:
    'Revoke every active Clerk session for the user. Best-effort: continues on individual session failures and reports the count. DEFERRED to Phase 2 — see user_request_password_reset for rationale. Calling this tool today returns precondition_failed.',
  inputSchema: z.object({
    userId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async () => {
    throw new ToolError(
      'precondition_failed',
      'user_revoke_all_sessions is deferred to Phase 2 — Clerk admin helpers not yet extracted to platform/',
    );
  },
};

/**
 * Allowlist of scopes the impersonation token can request. `platform_admin`
 * is intentionally excluded — operators must use their own platform_admin
 * key, not mint a self-replica under another user's identity.
 */
const ImpersonationScopeEnum = z.enum(['read', 'write']);

export const userImpersonateTokenTool: ToolDefinition = {
  name: 'user_impersonate_token',
  description:
    'Mint a tenant-scoped API key whose creator is the target user — incoming requests bearing the key resolve to ctx.user = target user (impersonation). Returns the plaintext key ONCE (`fullKey`). The SA operator must revoke it via system_api_key_revoke after use. `expiresInMinutes` is accepted for forward compatibility but currently ignored — ApiKey has no expiresAt column yet (Phase 2). `scope` is limited to "read" or "write"; platform_admin self-replication is forbidden.',
  inputSchema: z.object({
    userId: z.string().uuid(),
    tenantId: z.string().uuid(),
    scope: ImpersonationScopeEnum.optional(),
    expiresInMinutes: z.number().int().min(1).max(60 * 24 * 30).optional(),
    name: z.string().min(1).max(80).optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    const scope = input.scope ?? 'read';
    // bcrypt is expensive — hash OUTSIDE the tx so the row lock stays
    // narrow. Matches the pattern in app/[locale]/(platform)/admin/api-keys/actions.ts.
    const { fullKey, prefix, hash } = await generateApiKey();
    const keyName =
      input.name ?? `mcp-impersonate-${input.userId.slice(0, 8)}-${Date.now().toString(36)}`;

    const created = await withTenant(input.tenantId, (tx) =>
      tx.apiKey.create({
        data: {
          tenantId: input.tenantId,
          name: keyName,
          keyPrefix: prefix,
          keyHash: hash,
          scope,
          createdById: input.userId,
        },
        select: { id: true, keyPrefix: true, scope: true, createdAt: true },
      }),
    );

    await writeChannelAudit({
      action: 'user.impersonation_token_minted',
      tenantId: input.tenantId,
      actor,
      details: {
        targetUserId: input.userId,
        apiKeyId: created.id,
        scope: created.scope,
        // Surface the requested TTL on the audit row even though the
        // engine doesn't honour it yet — gives forensic grounding when
        // Phase 2 ships expiresAt.
        requestedExpiresInMinutes: input.expiresInMinutes ?? null,
      },
      ctx,
    });

    return {
      apiKeyId: created.id,
      keyPrefix: created.keyPrefix,
      fullKey,
      scope: created.scope,
      tenantId: input.tenantId,
      userId: input.userId,
      createdAt: created.createdAt.toISOString(),
    };
  },
};

/**
 * Tool registry.
 * `server.ts` spreads this array into the global tool list.
 */
export const userTools: ToolDefinition[] = [
  userListTool,
  userGetTool,
  userSoftDeleteTool,
  userRequestPasswordResetTool,
  userRevokeAllSessionsTool,
  userImpersonateTokenTool,
];
