// GENERATED FILE — do not edit by hand. Run `pnpm generate:mcp` to regenerate.
// Source: scripts/generate-mcp-tools.ts walks getRegistry().accumulationRegister.
//
// The 3 register tools are polymorphic over `registerId` so a single tool
// definition covers every accumulation register in the system. Per-register
// dimension and resource shapes are validated by the engine helpers in
// platform/engine/register-query.ts — see scripts/generate-mcp-tools.ts for
// the rationale (tool-description prompt budget).
//
// Engine boundary: register-query helpers take a Prisma tx (not an
// AppContext), so the handlers below open a `withTenant` transaction
// per call. The tenant id is taken from the MCP context — the route adapter
// guarantees it matches the bearer key's tenant binding.
//
// Information registers (e.g. `inventory.product_price`) are intentionally
// excluded — they have a distinct query surface
// (platform/engine/information-register-query.ts) and a separate Phase-2
// codegen pass.

import { z } from 'zod';
import { ToolError } from '../error-map';
import type { McpAppContext, ToolDefinition } from '../types';
import {
  balanceAsOf,
  listMovementsPaged,
  turnover,
} from '@/platform/engine/register-query';
import { withTenant } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata/registry';
import { serializeRow } from '@/app/api/v1/_lib/serialize';

const REGISTER_IDS = z.enum(["inventory.stock_balance", "purchases.accounts_payable", "purchases.expected_stock", "sales.accounts_receivable", "sales.reserved_stock", "sales.sale", "treasury.bank_funds", "treasury.cash_funds", "treasury.fx_pl"]);

/**
 * Type-narrowing guard for the request-scoped tenant id. Throws
 * `tenant_required` (a dedicated ToolErrorCode, not `forbidden`) so error
 * dashboards can distinguish "key has no tenant binding" from "scope rank too
 * low". The translated message lives under `tool.errors.tenant_required` in
 * the MCP i18n catalog.
 */
function requireTenant(tenantId: string | null): string {
  if (!tenantId) throw new ToolError('tenant_required', '__t:tool.errors.tenant_required');
  return tenantId;
}

/**
 * The engine helpers (balanceAsOf, turnover, listMovementsPaged) take a full AppContext
 * with `permissions`, `scopesByEntity`, `tenant`, `user`, `addons`,
 * etc. The MCP route forwards that AppContext through `ctx.appContext` so
 * tool handlers never need to re-resolve auth. If the field is missing we
 * abort with `internal_error` — this should never happen because the route
 * always attaches it, but guarding catches contract drift early.
 *
 * The cast to `never` at the engine-call boundary is deliberate: this
 * generated file is kept structurally isolated from the app's
 * `AppContext` shape (no `@/platform/auth/current-context` import) so the
 * `@ishflow/mcp-tools` package stays a leaf. The route adapter forwards
 * the real concrete AppContext via `McpAppContext`; the cast bridges the
 * narrower structural type back to whatever the engine helpers accept.
 */
function requireAppContext(appContext: McpAppContext | undefined): McpAppContext {
  if (!appContext) {
    throw new ToolError(
      'internal_error',
      'tool dispatched without AppContext — MCP route adapter is out of sync',
    );
  }
  return appContext;
}

function requireAccumulationRegister(registerId: string) {
  const cfg = getRegistry().accumulationRegister[registerId];
  if (!cfg) throw new ToolError('not_found', `unknown register: ${registerId}`);
  return cfg;
}

export const registerBalanceTool: ToolDefinition = {
  name: 'register_balance',
  description: "Compute the signed balance of an accumulation register's primary resource at an instant in time. Supported registerIds: `inventory.stock_balance`, `purchases.accounts_payable`, `purchases.expected_stock`, `sales.accounts_receivable`, `sales.reserved_stock`, `sales.sale`, `treasury.bank_funds`, `treasury.cash_funds`, `treasury.fx_pl`. `dims` narrows the rows considered (e.g. { counterparty: '<uuid>', currency: 'USD' }); omit to balance across every dimension. `asOf` snapshots the balance at a past instant (omit for \"now\"). Returns { quantity }.",
  inputSchema: z.object({
    registerId: REGISTER_IDS,
    dims: z.record(z.unknown()).optional(),
    asOf: z.string().datetime().optional(),
  }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    const tenantId = requireTenant(ctx.tenantId);
    // `appContext` is forwarded by the route adapter but not consumed by the
    // register-query helpers — they take a Prisma tx. Touching it here keeps
    // the symmetry with catalog/document tools and triggers the same
    // `internal_error` if the route adapter ever drifts.
    requireAppContext(ctx.appContext);
    const cfg = requireAccumulationRegister(input.registerId);
    const asOf = input.asOf ? new Date(input.asOf) : new Date();
    return withTenant(tenantId, (tx) => balanceAsOf(tx, cfg, input.dims ?? {}, asOf));
  },
};

export const registerTurnoverTool: ToolDefinition = {
  name: 'register_turnover',
  description: "Compute period turnover (opening, income, expense, closing) for an accumulation register's primary resource, grouped by dimensions. Supported registerIds: `inventory.stock_balance`, `purchases.accounts_payable`, `purchases.expected_stock`, `sales.accounts_receivable`, `sales.reserved_stock`, `sales.sale`, `treasury.bank_funds`, `treasury.cash_funds`, `treasury.fx_pl`. `dims` filters movements before aggregation; `groupBy` is an array of dimension keys to group by (omit to group by every dimension of the register). Returns an array of rows, each with the grouped dimension values plus { opening, income, expense, closing }. Empty `groupBy` yields a single aggregate row.",
  inputSchema: z.object({
    registerId: REGISTER_IDS,
    dims: z.record(z.unknown()).optional(),
    groupBy: z.array(z.string()).optional(),
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    const tenantId = requireTenant(ctx.tenantId);
    requireAppContext(ctx.appContext);
    const cfg = requireAccumulationRegister(input.registerId);
    // Default groupBy to every dimension of the register — same default as
    // app/api/reports/turnover/[register]/xlsx/route.ts. Callers can pass an
    // empty array explicitly to get a single aggregate row.
    const groupBy = input.groupBy ?? Object.keys(cfg.dimensions);
    return withTenant(tenantId, (tx) =>
      turnover(tx, cfg, input.dims ?? {}, {
        from: new Date(input.from),
        to: new Date(input.to),
        groupBy,
      }),
    );
  },
};

export const registerMovementsTool: ToolDefinition = {
  name: 'register_movements',
  description: "List individual movements for an accumulation register, paginated and ordered by timestamp desc. Supported registerIds: `inventory.stock_balance`, `purchases.accounts_payable`, `purchases.expected_stock`, `sales.accounts_receivable`, `sales.reserved_stock`, `sales.sale`, `treasury.bank_funds`, `treasury.cash_funds`, `treasury.fx_pl`. `dims` narrows by dimension values; `from`/`to` narrow by movement timestamp. Page size is clamped to [1, 200]. Inactive (soft-deleted by unposting) movements are excluded unless `includeInactive` is true. Returns { rows, total, page, pageSize }.",
  inputSchema: z.object({
    registerId: REGISTER_IDS,
    dims: z.record(z.unknown()).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.number().int().min(1).max(10_000).optional(),
    pageSize: z.number().int().min(1).max(200).optional(),
    includeInactive: z.boolean().optional(),
  }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    const tenantId = requireTenant(ctx.tenantId);
    requireAppContext(ctx.appContext);
    const cfg = requireAccumulationRegister(input.registerId);
    // Fold the optional from/to range into a timestamp where clause on top of
    // the dim filter. `listMovementsPaged` strips any caller-supplied
    // `active` key so activation state stays controlled by `includeInactive`.
    const timestampWhere: Record<string, unknown> = {};
    if (input.from) timestampWhere.gte = new Date(input.from);
    if (input.to) timestampWhere.lte = new Date(input.to);
    const filter: Record<string, unknown> = { ...(input.dims ?? {}) };
    if (Object.keys(timestampWhere).length) filter.timestamp = timestampWhere;

    const { rows, total, page, pageSize } = await withTenant(tenantId, (tx) =>
      listMovementsPaged(tx, cfg, {
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 50,
        filter,
        includeInactive: input.includeInactive ?? false,
      }),
    );
    return {
      rows: rows.map((r) => serializeRow(r)),
      total,
      page,
      pageSize,
    };
  },
};

export const registerTools: ToolDefinition[] = [
  registerBalanceTool,
  registerTurnoverTool,
  registerMovementsTool,
];
