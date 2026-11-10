/**
 * Billing super-admin tools — hand-written MCP wrappers around
 * `platform/super-admin/revenue.ts` and
 * `platform/super-admin/manual-plan-change.ts`.
 *
 * All 3 tools require ApiKeyScope `platform_admin`. The MCP route's auth
 * floor is `read`; per-tool scope is enforced inside `dispatchTool` via
 * `requiredScope`. A read or write key naming any of these tools is
 * rejected with `forbidden` before the handler runs.
 *
 * Audit pattern:
 *   - Reads (`billing_revenue_snapshot`) DO NOT write a channel audit row
 *     — observability call.
 *   - Writes (`billing_manual_plan_change`) write the canonical engine row
 *     (`plan.changed`) inside `changeTenantPlan` plus a channel row with
 *     `mcp.billing.plan_changed` so the SA audit dashboard can attribute
 *     the change to the MCP delivery channel.
 *
 * Naming clash with tenant_change_subscription:
 *   - `tenant_change_subscription` (Task 9) and `billing_manual_plan_change`
 *     (this file) wrap the same engine action (`changeTenantPlan`). Kept as
 *     two distinct MCP tools because the LLM surface stays expressive even
 *     when engine surface is shared: an LLM reasoning about *tenants*
 *     reaches for `tenant_change_subscription`; an LLM reasoning about
 *     *billing operations* (manual upgrade, bank-transfer flow) reaches
 *     for `billing_manual_plan_change`. Channel-audit `action` is also
 *     distinct (`plan.changed` vs `billing.plan_changed`) so dashboards
 *     can attribute by intent, not just by engine call.
 *
 * Deferred tools (Phase 2):
 *   - `billing_events_list` — there is no leaf-importable platform helper
 *     that lists `BillingEvent` rows across tenants. The SA subscription
 *     page reads them inline via `withBypass`, but BillingEvent has RLS
 *     enabled (`prisma/migrations/20260512074931_billing_event` enables
 *     ENABLE + FORCE RLS) so cross-tenant reads must enter `withBypass`.
 *     This package is contractually `withBypass`-free (see lint rule in
 *     Task 12 + comment in `tenant-tools.ts:18`). Tool is registered but
 *     handler throws `precondition_failed`. Hook up in Phase 2 once a
 *     `listBillingEventsAcrossTenants` helper lands under
 *     `platform/super-admin/`.
 */
import { changeTenantPlan } from '@/platform/super-admin/manual-plan-change';
import { getRevenueSnapshot } from '@/platform/super-admin/revenue';
import { z } from 'zod';
import { ToolError } from '../error-map';
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

/* -------------------------------------------------------------------- */
/* Reads (2 — 1 wired, 1 deferred)                                      */
/* -------------------------------------------------------------------- */

export const billingEventsListTool: ToolDefinition = {
  name: 'billing_events_list',
  description:
    'List BillingEvent rows across all tenants for forensic / reconciliation review. Filterable by `tenantId`, `type` (e.g. `customer.subscription.updated`), and `since` (ISO datetime). DEFERRED to Phase 2 — BillingEvent has RLS enabled so cross-tenant reads need `withBypass`, which this package may not use. Calling this tool today returns precondition_failed. Hook up once a `listBillingEventsAcrossTenants` helper lands under platform/super-admin/.',
  inputSchema: z.object({
    tenantId: z.string().uuid().optional(),
    type: z.string().min(1).max(120).optional(),
    since: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.string().uuid().optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async () => {
    throw new ToolError(
      'precondition_failed',
      'billing_events_list is deferred to Phase 2 — no leaf-importable platform helper for cross-tenant BillingEvent reads',
    );
  },
};

export const billingRevenueSnapshotTool: ToolDefinition = {
  name: 'billing_revenue_snapshot',
  description:
    'Platform-wide revenue snapshot: MRR by plan + currency (USD-normalised), plan distribution, last-30d churn count, last-30d trial conversion fraction, and total MRR in USD. Reads tenants with `withBypass` inside the engine helper. Plan→USD constants are inlined inside the helper (see platform/super-admin/revenue.ts).',
  inputSchema: z.object({}),
  requiredScope: 'platform_admin',
  handler: async () => {
    return getRevenueSnapshot();
  },
};

/* -------------------------------------------------------------------- */
/* Writes (1)                                                           */
/* -------------------------------------------------------------------- */

export const billingManualPlanChangeTool: ToolDefinition = {
  name: 'billing_manual_plan_change',
  description:
    'Apply a manual plan / status change to a tenant, bypassing Stripe. Designed for billing-side overrides (bank transfer flows, off-platform deals, comp accounts). Writes a synthetic billing_event row + a PlatformAuditLog row inside the engine action; this wrapper layers a channel audit row with `mcp.billing.plan_changed`. Reason is required (min 3 chars). Note: shares the engine surface with `tenant_change_subscription` — kept distinct so the LLM can pick by intent.',
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
      action: 'billing.plan_changed',
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
export const billingTools: ToolDefinition[] = [
  billingEventsListTool,
  billingRevenueSnapshotTool,
  billingManualPlanChangeTool,
];
