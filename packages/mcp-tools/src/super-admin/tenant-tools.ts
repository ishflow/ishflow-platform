/**
 * Tenant super-admin tools — hand-written MCP wrappers around
 * `platform/super-admin/**`.
 *
 * All 12 tools require ApiKeyScope `platform_admin`. The MCP route's auth
 * floor is `read`; per-tool scope is enforced inside `dispatchTool` via
 * `requiredScope`. A read or write key naming any of these tools is
 * rejected with `forbidden` before the handler runs.
 *
 * Audit pattern:
 *   - The wrapped super-admin actions write their own PlatformAuditLog row
 *     inside their own `withBypass` tx. That row records the operator
 *     action (e.g. `tenant.suspended`) with before/after payload.
 *   - This wrapper layers a SECOND PlatformAuditLog row with a `mcp.*`
 *     action prefix and `source: 'mcp'` so the audit dashboard can
 *     attribute the change to the MCP delivery channel. PlatformAuditLog
 *     has no RLS (global table), so we can write directly via the shared
 *     prisma client without entering a withBypass scope — keeping this
 *     package free of `withBypass` calls (lint rule from Task 12).
 *
 * Destructive operations (`tenant_wipe_data`, `tenant_hard_delete`)
 * require BOTH a `confirm: "YES"` literal AND a `confirmSlug` that must
 * match the tenant's slug (engine enforces the slug match; the literal
 * keeps an LLM from accidentally invoking the tool with minimal args).
 */
import { listTenants } from '@/platform/super-admin/list-tenants';
import { changeTenantPlan } from '@/platform/super-admin/manual-plan-change';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { createTenantNote } from '@/platform/super-admin/tenants/notes';
import { upsertTenantPriceOverride } from '@/platform/super-admin/tenants/overrides';
import { createTenantTag } from '@/platform/super-admin/tenants/tags';
import {
  archiveTenant,
  hardDeleteTenant,
  liftTenantSuspension,
  suspendTenant,
  transferTenantOwnership,
  wipeTenantData,
} from '@/platform/super-admin/tenants/tenant-ops';
import { z } from 'zod';
import type { ToolDefinition } from '../types';
import { requireActor, writeChannelAudit } from './common';

const TenantPlanEnum = z.enum(['free', 'starter', 'pro', 'business', 'enterprise']);
const TenantStatusEnum = z.enum([
  'active',
  'trialing',
  'past_due',
  'suspended',
  'cancelled',
  'deleted',
]);

const ListTenantStatusEnum = z.enum(['active', 'suspended', 'archived']);

/* -------------------------------------------------------------------- */
/* Reads (2)                                                            */
/* -------------------------------------------------------------------- */

export const tenantListTool: ToolDefinition = {
  name: 'tenant_list',
  description:
    'List tenants across the platform. Filterable by free-text search (name / slug), plan, and status. Cursor-paginated (limit ≤ 100). Returns { rows, nextCursor }.',
  inputSchema: z.object({
    search: z.string().max(200).optional(),
    plan: TenantPlanEnum.optional(),
    status: ListTenantStatusEnum.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().uuid().optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    // `listTenants` accepts `status: TenantStatus` (active|suspended|...).
    // The MCP surface narrows it to the operator-facing tri-state
    // (active|suspended|archived); "archived" is modelled by deletedAt on
    // the engine side, which `listTenants` already filters out by default.
    // For now we forward only `active` / `suspended`; `archived` is a
    // no-op against the current engine and returns the default unfiltered
    // result. A future engine change should expose deletedAt filtering.
    const engineStatus = input.status === 'archived' ? undefined : input.status;
    return listTenants({
      q: input.search,
      plan: input.plan,
      status: engineStatus,
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};

export const tenantGetTool: ToolDefinition = {
  name: 'tenant_get',
  description:
    'Get the operator overview for a single tenant (plan, status, owner count, total document count, MRR in USD). Returns null if the tenant does not exist.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    return getTenantOverview(input.tenantId);
  },
};

/* -------------------------------------------------------------------- */
/* Writes (10)                                                          */
/* -------------------------------------------------------------------- */

export const tenantSuspendTool: ToolDefinition = {
  name: 'tenant_suspend',
  description:
    'Suspend a tenant. Users are redirected to /suspended; operator actions remain available. Reason is required (min 3 chars) and recorded in PlatformAuditLog.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    reason: z.string().min(3).max(500),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    await suspendTenant({
      tenantId: input.tenantId,
      reason: input.reason,
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.suspended',
      tenantId: input.tenantId,
      actor,
      details: { reason: input.reason },
      ctx,
    });
    return { ok: true, tenantId: input.tenantId };
  },
};

export const tenantLiftSuspensionTool: ToolDefinition = {
  name: 'tenant_lift_suspension',
  description:
    'Lift a tenant suspension. Tenant status returns to active immediately and the TenantSuspension row is closed.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    await liftTenantSuspension({
      tenantId: input.tenantId,
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.suspension_lifted',
      tenantId: input.tenantId,
      actor,
      ctx,
    });
    return { ok: true, tenantId: input.tenantId };
  },
};

export const tenantArchiveTool: ToolDefinition = {
  name: 'tenant_archive',
  description:
    'Archive (soft-delete) a tenant. Tenant becomes invisible to active lists; data is kept for 30 days and can be restored within that window. Hard delete becomes available after 30 days.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    reason: z.string().min(3).max(500).optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    // archiveTenant does not currently accept a reason field — it's
    // accepted here for forward compatibility and recorded on the
    // channel audit row. Promote into the engine input when the action
    // gains a `reason` parameter.
    await archiveTenant({
      tenantId: input.tenantId,
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.archived',
      tenantId: input.tenantId,
      actor,
      details: input.reason ? { reason: input.reason } : undefined,
      ctx,
    });
    return { ok: true, tenantId: input.tenantId };
  },
};

export const tenantTransferOwnershipTool: ToolDefinition = {
  name: 'tenant_transfer_ownership',
  description:
    'Transfer the `owner` system role to a new user. The target user must already have a membership in the tenant. The previous owner keeps their other roles but loses owner.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    newOwnerUserId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    await transferTenantOwnership({
      tenantId: input.tenantId,
      newOwnerUserId: input.newOwnerUserId,
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.ownership_transferred',
      tenantId: input.tenantId,
      actor,
      details: { newOwnerUserId: input.newOwnerUserId },
      ctx,
    });
    return { ok: true, tenantId: input.tenantId };
  },
};

export const tenantWipeDataTool: ToolDefinition = {
  name: 'tenant_wipe_data',
  description:
    'PERMANENT: remove all transactional rows (every document, line, and register movement) for one tenant while preserving catalogs, memberships, and settings. Requires confirm:"YES" AND confirmSlug matching the tenant slug.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    confirm: z.literal('YES'),
    confirmSlug: z.string().min(1).max(120),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    await wipeTenantData({
      tenantId: input.tenantId,
      confirmSlug: input.confirmSlug,
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.data_wiped',
      tenantId: input.tenantId,
      actor,
      ctx,
    });
    return { ok: true, tenantId: input.tenantId };
  },
};

export const tenantHardDeleteTool: ToolDefinition = {
  name: 'tenant_hard_delete',
  description:
    'PERMANENT: delete a tenant and every FK-cascaded row. Requires either 30 days archived OR explicit bypassWindow=true, AND confirm:"YES" AND confirmSlug matching the tenant slug. Audit row outlives the deletion.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    confirm: z.literal('YES'),
    confirmSlug: z.string().min(1).max(120),
    bypassWindow: z.boolean().optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    await hardDeleteTenant({
      tenantId: input.tenantId,
      confirmSlug: input.confirmSlug,
      bypassWindow: input.bypassWindow,
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.hard_deleted',
      tenantId: input.tenantId,
      actor,
      ctx,
    });
    return { ok: true, tenantId: input.tenantId };
  },
};

export const tenantAddNoteTool: ToolDefinition = {
  name: 'tenant_add_note',
  description:
    'Add an operator-only Markdown note to a tenant. Notes are visible in the SA console and recorded in PlatformAuditLog. Body is required (min 1 char).',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    body: z.string().min(1).max(10_000),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    const note = await createTenantNote({
      tenantId: input.tenantId,
      body: input.body,
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.note_added',
      tenantId: input.tenantId,
      actor,
      details: { noteId: note.id },
      ctx,
    });
    return note;
  },
};

export const tenantSetTagTool: ToolDefinition = {
  name: 'tenant_set_tag',
  description:
    'Upsert an operator-only tag on a tenant. `tag` is the label (unique per tenant); optional `color` is a 7-char hex token (e.g. `#6b7280`) that defaults to neutral grey when omitted. Idempotent.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    tag: z.string().min(1).max(64),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'must be a 7-char hex color like #6b7280')
      .optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    const tag = await createTenantTag({
      tenantId: input.tenantId,
      label: input.tag,
      color: input.color ?? '#6b7280',
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.tag_added',
      tenantId: input.tenantId,
      actor,
      details: { label: tag.label, color: tag.color },
      ctx,
    });
    return tag;
  },
};

export const tenantSetOverrideTool: ToolDefinition = {
  name: 'tenant_set_override',
  description:
    'Set a per-tenant override on top of the published plan matrix. Currently the only supported `key` is `price` — `value` is the monthly USD amount as a number. Reason is recorded for the audit row. Returns the upserted TenantPriceOverride.',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    key: z.literal('price'),
    value: z.number().nonnegative().max(1_000_000),
    reason: z.string().min(3).max(500).optional(),
    effectiveUntil: z.string().datetime().optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    const override = await upsertTenantPriceOverride({
      tenantId: input.tenantId,
      monthlyPriceUsd: input.value,
      reason: input.reason ?? null,
      effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : null,
      actorUserId: actor.userId,
      actorClerkId: actor.clerkId,
      ip: null,
      userAgent: null,
    });
    await writeChannelAudit({
      action: 'tenant.price_override_set',
      tenantId: input.tenantId,
      actor,
      details: { key: input.key, value: input.value },
      ctx,
    });
    return override;
  },
};

export const tenantChangeSubscriptionTool: ToolDefinition = {
  name: 'tenant_change_subscription',
  description:
    'Apply a manual plan / status change to a tenant, bypassing Stripe. Designed for bank-transfer flows. Writes a synthetic billing_event and a PlatformAuditLog row. Reason is required (min 3 chars).',
  inputSchema: z.object({
    tenantId: z.string().uuid(),
    plan: TenantPlanEnum,
    status: TenantStatusEnum.optional(),
    reason: z.string().min(3).max(500),
  }),
  requiredScope: 'platform_admin',
  handler: async (input, ctx) => {
    const actor = requireActor(ctx);
    await changeTenantPlan({
      tenantId: input.tenantId,
      plan: input.plan,
      status: input.status ?? 'active',
      reason: input.reason,
      actorClerkId: actor.clerkId,
    });
    await writeChannelAudit({
      action: 'plan.changed',
      tenantId: input.tenantId,
      actor,
      details: { plan: input.plan, status: input.status ?? 'active' },
      ctx,
    });
    return { ok: true, tenantId: input.tenantId, plan: input.plan };
  },
};

/**
 * Tool registry.
 * `server.ts` spreads this array into the global tool list.
 */
export const tenantTools: ToolDefinition[] = [
  tenantListTool,
  tenantGetTool,
  tenantSuspendTool,
  tenantLiftSuspensionTool,
  tenantArchiveTool,
  tenantTransferOwnershipTool,
  tenantWipeDataTool,
  tenantHardDeleteTool,
  tenantAddNoteTool,
  tenantSetTagTool,
  tenantSetOverrideTool,
  tenantChangeSubscriptionTool,
];
