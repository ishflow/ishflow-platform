// GENERATED FILE — do not edit by hand. Run `pnpm generate:mcp` to regenerate.
// Source: scripts/generate-mcp-tools.ts walks getRegistry().catalog.
//
// The 5 catalog tools are polymorphic over `configId` so a single tool
// definition covers every catalog in the system. Per-catalog field shapes
// are validated at the engine level (platform/engine/crud.ts + zod-schema),
// not in the MCP inputSchema — see scripts/generate-mcp-tools.ts for the
// rationale (tool-description prompt budget).

import { z } from 'zod';
import { ToolError } from '../error-map';
import type { McpAppContext, ToolDefinition } from '../types';
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecordsPaged,
  updateRecord,
} from '@/platform/engine/crud';
import { writeAudit } from '@/platform/engine/audit-log';
import { getRegistry } from '@/platform/metadata/registry';
import { serializeRow } from '@/app/api/v1/_lib/serialize';

const CATALOG_IDS = z.enum(["assets.fixed_asset", "inventory.product", "inventory.product_category", "inventory.product_group", "inventory.warehouse", "platform.currency", "purchases.supplier", "sales.customer", "sales.price_agreement", "sales.price_type", "treasury.bank_account", "treasury.cash_register"]);

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
 * The engine helpers (createRecord, getRecord, …) take a full AppContext
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

function requireCatalog(configId: string) {
  const cfg = getRegistry().catalog[configId];
  if (!cfg) throw new ToolError('not_found', `unknown catalog: ${configId}`);
  return cfg;
}

export const catalogListTool: ToolDefinition = {
  name: 'catalog_list',
  description: "List records from any ishflow catalog. Supported configIds: `assets.fixed_asset`, `inventory.product`, `inventory.product_category`, `inventory.product_group`, `inventory.warehouse`, `platform.currency`, `purchases.supplier`, `sales.customer`, `sales.price_agreement`, `sales.price_type`, `treasury.bank_account`, `treasury.cash_register`. Supports pagination (page, pageSize) and free-text search by display field. Returns { rows, total, page, pageSize }.",
  inputSchema: z.object({
    configId: CATALOG_IDS,
    page: z.number().int().min(1).max(10_000).default(1).optional(),
    pageSize: z.number().int().min(1).max(100).default(50).optional(),
    search: z.string().max(200).optional(),
  }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireCatalog(input.configId);
    // `as never` documents the structural-cast boundary: this generated file
    // intentionally doesn't import AppContext, so we hand the engine helpers
    // the narrower McpAppContext via `never`. The route adapter built it
    // from a real AppContext, so the shape is identical at runtime.
    const { rows, total, page, pageSize } = await listRecordsPaged(appCtx as never, cfg, {
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 50,
      search: input.search,
    });
    return {
      rows: rows.map((r) => serializeRow(r)),
      total,
      page,
      pageSize,
    };
  },
};

export const catalogGetTool: ToolDefinition = {
  name: 'catalog_get',
  description:
    'Fetch a single record from any ishflow catalog by its id. Throws `not_found` if the record is archived (soft-deleted), missing, or out of the caller scope.',
  inputSchema: z.object({ configId: CATALOG_IDS, id: z.string().uuid() }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireCatalog(input.configId);
    const row = await getRecord(appCtx as never, cfg, input.id);
    return serializeRow(row);
  },
};

export const catalogCreateTool: ToolDefinition = {
  name: 'catalog_create',
  description:
    "Create a new record in any ishflow catalog. The fields object must match the catalog's DSL; per-catalog field shapes are validated by the engine, not by the MCP inputSchema. Returns the created row (id + persisted fields, with snake_case columns remapped to camelCase).",
  inputSchema: z.object({
    configId: CATALOG_IDS,
    fields: z.record(z.unknown()),
  }),
  requiredScope: 'write',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireCatalog(input.configId);
    const created = await createRecord(appCtx as never, cfg, input.fields);
    // The engine writes a generic `create` audit row inside its own withBypass
    // tx. The MCP tool wrapper layers a channel-level `api_create` row with
    // `source: 'mcp'` so the audit dashboard can attribute the change to the
    // MCP delivery channel. Same dual-audit pattern as /api/v1/customers.
    await writeAudit(null, appCtx as never, {
      entity: `catalog.${cfg.module}.${cfg.name}`,
      entityId: String(created.id),
      action: 'api_create',
      after: created,
      source: 'mcp',
      metadata: { correlationId: ctx.correlationId },
    });
    return serializeRow(created);
  },
};

export const catalogUpdateTool: ToolDefinition = {
  name: 'catalog_update',
  description:
    'Update a record in any ishflow catalog. Only the keys present in `fields` are modified; omitted keys keep their current values. Returns the updated row.',
  inputSchema: z.object({
    configId: CATALOG_IDS,
    id: z.string().uuid(),
    fields: z.record(z.unknown()),
  }),
  requiredScope: 'write',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireCatalog(input.configId);
    const updated = await updateRecord(appCtx as never, cfg, input.id, input.fields);
    await writeAudit(null, appCtx as never, {
      entity: `catalog.${cfg.module}.${cfg.name}`,
      entityId: input.id,
      action: 'api_update',
      after: updated,
      source: 'mcp',
      metadata: { correlationId: ctx.correlationId },
    });
    return serializeRow(updated);
  },
};

export const catalogArchiveTool: ToolDefinition = {
  name: 'catalog_archive',
  description:
    'Soft-delete (archive) a record in any ishflow catalog. The record becomes invisible to non-archived listings (deletedAt is stamped) but is recoverable by an admin. Returns { ok: true, id }.',
  inputSchema: z.object({ configId: CATALOG_IDS, id: z.string().uuid() }),
  requiredScope: 'write',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireCatalog(input.configId);
    // deleteRecord in platform/engine/crud.ts is a soft-delete: it stamps
    // deletedAt rather than removing the row. The "archive" naming aligns
    // with the MCP surface vocabulary; semantics are unchanged.
    await deleteRecord(appCtx as never, cfg, input.id);
    await writeAudit(null, appCtx as never, {
      entity: `catalog.${cfg.module}.${cfg.name}`,
      entityId: input.id,
      action: 'api_delete',
      source: 'mcp',
      metadata: { correlationId: ctx.correlationId },
    });
    return { ok: true, id: input.id };
  },
};

export const catalogTools: ToolDefinition[] = [
  catalogListTool,
  catalogGetTool,
  catalogCreateTool,
  catalogUpdateTool,
  catalogArchiveTool,
];
