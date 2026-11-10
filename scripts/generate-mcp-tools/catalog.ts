/**
 * Catalog tools codegen. Emits packages/mcp-tools/src/generated/catalog-tools.ts
 * by walking getRegistry().catalog. Five polymorphic tools — list / get /
 * create / update / archive — over a shared `configId` enum.
 *
 * Per-catalog field shapes are NOT validated in the MCP inputSchema (would
 * blow the tool-description prompt budget); they're validated by the engine
 * via the DSL's zod schema.
 */
import { getRegistry } from '@/platform/metadata/registry';

import {
  REQUIRE_TENANT_FRAGMENT,
  ensureOutDir,
  requireAppContextFragment,
  sharedImports,
  writeGeneratedFile,
} from './common';

const HEADER = `// GENERATED FILE — do not edit by hand. Run \`pnpm generate:mcp\` to regenerate.
// Source: scripts/generate-mcp-tools.ts walks getRegistry().catalog.
//
// The 5 catalog tools are polymorphic over \`configId\` so a single tool
// definition covers every catalog in the system. Per-catalog field shapes
// are validated at the engine level (platform/engine/crud.ts + zod-schema),
// not in the MCP inputSchema — see scripts/generate-mcp-tools.ts for the
// rationale (tool-description prompt budget).
`;

const CATALOG_ENGINE_IMPORTS = `import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecordsPaged,
  updateRecord,
} from '@/platform/engine/crud';`;

function generateCatalogTools(): string {
  const registry = getRegistry();
  const catalogIds = Object.keys(registry.catalog).sort();
  if (catalogIds.length === 0) {
    throw new Error(
      'generate-mcp-tools: getRegistry().catalog is empty. Did `import "@/configs"` populate the registry? ' +
        'If you renamed configs/index.ts, update the import in this script.',
    );
  }
  const enumLiteral = catalogIds.map((id) => JSON.stringify(id)).join(', ');
  // Build a deterministic, JSON-encoded list of supported configIds for the
  // `catalog_list` description so the emitted prose never drifts from the
  // enum. Inlining this avoids the historical bug where the description named
  // catalogs (`assets.fixed_asset`, `treasury.bank_account`) that weren't yet
  // in the registry, misleading agents on prompt budget assumptions.
  const catalogsList = catalogIds.map((id) => `\`${id}\``).join(', ');
  const catalogListDescription = `List records from any ishflow catalog. Supported configIds: ${catalogsList}. Supports pagination (page, pageSize) and free-text search by display field. Returns { rows, total, page, pageSize }.`;

  return `${HEADER}
${sharedImports(CATALOG_ENGINE_IMPORTS)}
const CATALOG_IDS = z.enum([${enumLiteral}]);

${REQUIRE_TENANT_FRAGMENT}

${requireAppContextFragment('createRecord, getRecord, …')}

function requireCatalog(configId: string) {
  const cfg = getRegistry().catalog[configId];
  if (!cfg) throw new ToolError('not_found', \`unknown catalog: \${configId}\`);
  return cfg;
}

export const catalogListTool: ToolDefinition = {
  name: 'catalog_list',
  description: ${JSON.stringify(catalogListDescription)},
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
    // \`as never\` documents the structural-cast boundary: this generated file
    // intentionally doesn't import AppContext, so we hand the engine helpers
    // the narrower McpAppContext via \`never\`. The route adapter built it
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
    'Fetch a single record from any ishflow catalog by its id. Throws \`not_found\` if the record is archived (soft-deleted), missing, or out of the caller scope.',
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
    // The engine writes a generic \`create\` audit row inside its own withBypass
    // tx. The MCP tool wrapper layers a channel-level \`api_create\` row with
    // \`source: 'mcp'\` so the audit dashboard can attribute the change to the
    // MCP delivery channel. Same dual-audit pattern as /api/v1/customers.
    await writeAudit(null, appCtx as never, {
      entity: \`catalog.\${cfg.module}.\${cfg.name}\`,
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
    'Update a record in any ishflow catalog. Only the keys present in \`fields\` are modified; omitted keys keep their current values. Returns the updated row.',
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
      entity: \`catalog.\${cfg.module}.\${cfg.name}\`,
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
      entity: \`catalog.\${cfg.module}.\${cfg.name}\`,
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
`;
}

export function generateCatalogToolsFile(): void {
  ensureOutDir();
  writeGeneratedFile('catalog-tools.ts', generateCatalogTools());
}
