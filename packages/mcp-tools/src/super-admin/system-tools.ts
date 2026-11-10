/**
 * System super-admin tools — hand-written MCP wrappers around the
 * platform-level read/write helpers in `platform/super-admin/system/*`.
 *
 * All 8 tools require ApiKeyScope `platform_admin`. The MCP route's auth
 * floor is `read`; per-tool scope is enforced inside `dispatchTool` via
 * `requiredScope`. A read or write key naming any of these tools is
 * rejected with `forbidden` before the handler runs.
 *
 * Audit pattern:
 *   - Reads (`system_env_status`, `system_db_stats`, `system_deploy_info`,
 *     `system_cron_runs`, `system_platform_setting_get`) DO NOT write an
 *     audit row — they're observability calls and would otherwise spam the
 *     PlatformAuditLog table.
 *   - Writes (`system_platform_setting_set`, `system_maintenance_mode`,
 *     `system_api_key_revoke`) write a channel audit row with action
 *     prefix `mcp.system.*`. `tenantId` is null on the channel audit row
 *     because these events have no tenant scope — see the nullable-tenant
 *     contract in `common.ts:ChannelAuditInput.tenantId`.
 *
 * Allowlist for `system_platform_setting_set`:
 *   `SETTABLE_PLATFORM_KEYS` enumerates the only keys an LLM may push
 *   through this tool. The list intentionally excludes anything that could
 *   change auth (Clerk keys), tenancy boundaries (RLS toggles), money
 *   movement (Stripe keys), or schema (migration flags). Keys outside the
 *   set are rejected with `forbidden` BEFORE the engine is called.
 *   To add a key: prove (a) operator-readable failure mode if mis-set,
 *   (b) no secret value, (c) no auth/RLS/schema/billing side effects, then
 *   extend the constant and ship a test row in `system-tools.test.ts`.
 */
import {
  listApiKeysAcrossTenants,
  revokeApiKey,
} from '@/platform/super-admin/system/api-keys';
import { listCronRuns, listKnownCrons } from '@/platform/super-admin/system/cron-runs';
import { getDbStats, getSlowQueries } from '@/platform/super-admin/system/db-stats';
import { getDeployInfo } from '@/platform/super-admin/system/deploy-info';
import { getEnvVarStatus } from '@/platform/super-admin/system/env-status';
import { setMaintenanceState } from '@/platform/super-admin/system/maintenance';
import {
  getPlatformSetting,
  listPlatformSettings,
  setPlatformSetting,
} from '@/platform/super-admin/system/platform-settings';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ToolError } from '../error-map';
import type { ToolDefinition } from '../types';
import { requireActor, writeChannelAudit } from './common';

/**
 * Operator-safe PlatformSetting keys that may be written via MCP.
 *
 * Curated for the LLM surface: every key here must (a) accept a non-secret
 * value, (b) have no auth / RLS / schema / billing side effects, and
 * (c) fail readably (the SA dashboard surfaces the parsed value) if
 * mis-set. Maintenance + read-only flags are the only Phase 1 entries
 * because they already have dedicated UI surfaces and battle-tested
 * parsers in `platform/super-admin/system/maintenance.ts`.
 *
 * To add a key: extend this Set AND assert it from a dedicated row in
 * `system-tools.test.ts` (the schema-level enum check uses `safeParse` so
 * adding a key without updating the test silently passes).
 */
export const SETTABLE_PLATFORM_KEYS = new Set<string>([
  'maintenance.enabled',
  'maintenance.until',
  'maintenance.message',
  'readonly.enabled',
]);

/* -------------------------------------------------------------------- */
/* Reads (5)                                                            */
/* -------------------------------------------------------------------- */

export const systemEnvStatusTool: ToolDefinition = {
  name: 'system_env_status',
  description:
    'Configuration audit for curated env var groups (Clerk / Stripe / Resend / AI Gateway / R2 / Vercel / Database). Values are never returned — only `configured` (truthy + non-empty) vs missing.',
  inputSchema: z.object({}),
  requiredScope: 'platform_admin',
  handler: async () => {
    return getEnvVarStatus();
  },
};

export const systemDbStatsTool: ToolDefinition = {
  name: 'system_db_stats',
  description:
    'Postgres health snapshot: total bytes, top-5 tables by size, active connection count, and optional pg_stat_statements top-N slow queries. Soft-fails gracefully when extensions are missing (e.g. Neon free tier) — `available:false` plus a human-readable reason.',
  inputSchema: z.object({
    slowQueryLimit: z.number().int().min(1).max(50).optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    const [stats, slow] = await Promise.all([
      getDbStats(),
      getSlowQueries(input.slowQueryLimit ?? 10),
    ]);
    return { stats, slow };
  },
};

export const systemDeployInfoTool: ToolDefinition = {
  name: 'system_deploy_info',
  description:
    'Current Vercel deployment card: deploymentId, state, createdAt, gitSha, deployment URL. Soft-fails to `available:false` outside Vercel or when VERCEL_API_TOKEN is missing. VERCEL_API_TOKEN itself is never returned.',
  inputSchema: z.object({}),
  requiredScope: 'platform_admin',
  handler: async () => {
    return getDeployInfo();
  },
};

export const systemCronRunsTool: ToolDefinition = {
  name: 'system_cron_runs',
  description:
    'Cron telemetry: recent `CronRun` rows newest-first plus the schedule list joined with each job\'s latest run. `limit` defaults to 50 and caps at 200.',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(200).optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    const [runs, known] = await Promise.all([
      listCronRuns(input.limit ?? 50),
      listKnownCrons(),
    ]);
    return { runs, known };
  },
};

export const systemPlatformSettingGetTool: ToolDefinition = {
  name: 'system_platform_setting_get',
  description:
    'Read one or all PlatformSetting rows. When `key` is omitted, returns the full sorted list (use sparingly — settings are global). When `key` is given, returns that row or null.',
  inputSchema: z.object({
    key: z.string().min(1).max(120).optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    if (input.key === undefined) {
      return listPlatformSettings();
    }
    return getPlatformSetting(input.key);
  },
};

/* -------------------------------------------------------------------- */
/* Writes (3)                                                           */
/* -------------------------------------------------------------------- */

export const systemPlatformSettingSetTool: ToolDefinition = {
  name: 'system_platform_setting_set',
  description:
    'Upsert one PlatformSetting key. `key` is restricted to a curated allowlist (currently maintenance.* + readonly.enabled) — auth, billing, schema, and tenancy keys are NOT settable through MCP. Forbidden keys are rejected with forbidden before any DB write.',
  inputSchema: z.object({
    key: z.string().min(1).max(120),
    value: z.unknown(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    if (!SETTABLE_PLATFORM_KEYS.has(input.key)) {
      throw new ToolError('forbidden', '__t:tool.errors.forbidden');
    }
    const actor = requireActor(ctx);
    // `value` is `unknown` to allow any JSON shape — the engine helper's
    // signature is `Prisma.InputJsonValue`. Reject `undefined` (which
    // Prisma rejects anyway) for a friendlier error than the SQL-layer
    // surprise.
    if (input.value === undefined) {
      throw new ToolError('validation_error', '__t:tool.errors.validation_error');
    }
    await setPlatformSetting(
      input.key,
      input.value as Prisma.InputJsonValue,
      actor.userId,
    );
    await writeChannelAudit({
      action: 'system.platform_setting_set',
      tenantId: null,
      actor,
      details: { key: input.key },
      ctx,
    });
    return { ok: true, key: input.key };
  },
};

export const systemMaintenanceModeTool: ToolDefinition = {
  name: 'system_maintenance_mode',
  description:
    'Toggle platform-wide maintenance mode. When enabled, tenant-app middleware redirects everyone to /maintenance and shows the optional countdown / message. The in-process cache (30s TTL) is invalidated automatically.',
  inputSchema: z.object({
    enabled: z.boolean(),
    until: z.string().datetime().nullable().optional(),
    message: z.string().min(1).max(500).nullable().optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    // Preserve null vs undefined distinction: setMaintenanceState treats
    // undefined as "skip" and null as "clear" (writes Prisma.JsonNull).
    // Spreading via `?? undefined` would collapse null → undefined and
    // operators would be unable to clear `until` / `message` via MCP.
    const payload: { enabled: boolean; until?: string | null; message?: string | null } = {
      enabled: input.enabled,
    };
    if (input.until !== undefined) payload.until = input.until;
    if (input.message !== undefined) payload.message = input.message;
    await setMaintenanceState(payload, actor.userId);
    await writeChannelAudit({
      action: input.enabled ? 'system.maintenance_enabled' : 'system.maintenance_disabled',
      tenantId: null,
      actor,
      details: {
        enabled: input.enabled,
        ...(input.until !== undefined ? { until: input.until } : {}),
        ...(input.message !== undefined ? { hasMessage: input.message !== null } : {}),
      },
      ctx,
    });
    return { ok: true, enabled: input.enabled };
  },
};

export const systemApiKeyRevokeTool: ToolDefinition = {
  name: 'system_api_key_revoke',
  description:
    'Revoke one API key by id (sets revokedAt = now). Cross-tenant — the operator can revoke any tenant\'s key, including impersonation tokens minted via user_impersonate_token. Idempotent: re-revoking an already-revoked key is a no-op against the DB but still writes a channel audit row.',
  inputSchema: z.object({
    apiKeyId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    await revokeApiKey(input.apiKeyId);
    await writeChannelAudit({
      action: 'system.api_key_revoked',
      tenantId: null,
      actor,
      details: { apiKeyId: input.apiKeyId },
      ctx,
    });
    return { ok: true, apiKeyId: input.apiKeyId };
  },
};

/**
 * Re-exported for tests that want to assert the API-key list helper still
 * compiles cleanly from the package boundary even though it's not exposed
 * as its own MCP tool. Listing all API keys is currently spec-deferred to
 * the audit/billing tools batch (Task 11); when it ships, this re-export
 * becomes the wrapped helper.
 */
export { listApiKeysAcrossTenants as _spec_listApiKeysAcrossTenants };

/**
 * Tool registry.
 * `server.ts` spreads this array into the global tool list.
 */
export const systemTools: ToolDefinition[] = [
  systemEnvStatusTool,
  systemDbStatsTool,
  systemDeployInfoTool,
  systemCronRunsTool,
  systemPlatformSettingGetTool,
  systemPlatformSettingSetTool,
  systemMaintenanceModeTool,
  systemApiKeyRevokeTool,
];
