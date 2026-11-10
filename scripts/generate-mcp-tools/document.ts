/**
 * Document tools codegen. Emits packages/mcp-tools/src/generated/document-tools.ts
 * by walking getRegistry().document. Six polymorphic tools — list / get /
 * create / post / unpost / clone — over a shared `configId` enum.
 *
 * Per-document field shapes (header + line sections) are NOT validated in the
 * MCP inputSchema; the engine's per-document zod schema handles that. Cloning
 * has no dedicated engine helper — see the inline note in the emitted file.
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
// Source: scripts/generate-mcp-tools.ts walks getRegistry().document.
//
// The 6 document tools are polymorphic over \`configId\` so a single tool
// definition covers every document in the system. Per-document field shapes
// (header + line sections) are validated at the engine level
// (platform/engine/document-crud.ts + zod-schema), not in the MCP inputSchema
// — see scripts/generate-mcp-tools.ts for the rationale (tool-description
// prompt budget).
//
// Cloning: ishflow has no dedicated \`cloneDocument\` engine helper. The clone
// flow is \`getDocument\` → strip engine-managed fields (id/number/status/
// postedAt/postedBy/createdAt/updatedAt/deletedAt/version/tenantId) →
// \`createDocument\` with the surviving header + lines. Mirrors
// \`cloneDocumentRecord\` in app/.../documents/[entity]/actions.ts.
`;

const DOCUMENT_ENGINE_IMPORTS = `import {
  createDocument,
  getDocument,
  listDocumentsPaged,
} from '@/platform/engine/document-crud';
import { postDocument, unpostDocument } from '@/platform/engine/posting';`;

function generateDocumentTools(): string {
  const registry = getRegistry();
  const documentIds = Object.keys(registry.document).sort();
  if (documentIds.length === 0) {
    throw new Error(
      'generate-mcp-tools: getRegistry().document is empty. Did `import "@/configs"` populate the registry? ' +
        'If you renamed configs/index.ts, update the import in this script.',
    );
  }
  const enumLiteral = documentIds.map((id) => JSON.stringify(id)).join(', ');
  // Build a deterministic list of supported configIds for each tool description
  // so the emitted prose never drifts from the enum.
  const documentsList = documentIds.map((id) => `\`${id}\``).join(', ');
  const documentListDescription = `List documents from any ishflow document type. Supported configIds: ${documentsList}. Supports pagination (page, pageSize), free-text search by number, status filter (SAVED | POSTED), and date range (dateFrom, dateTo) over the document's business date. Returns { rows, total, page, pageSize }.`;
  const documentGetDescription =
    'Fetch a single document by id, including its line sections. Throws `not_found` if the document is archived (soft-deleted), missing, or out of the caller scope.';
  const documentCreateDescription =
    "Create a new SAVED (draft) document. The `fields` object must include the header columns required by the document's DSL (e.g. `date`, `customer`, `warehouse`) and may include a `lines` map keyed by section name (e.g. `lines: { items: [...] }`) — both are validated at the engine level. The document number is allocated automatically. Returns the created document with id, allocated number, status='SAVED', and lines.";
  const documentPostDescription =
    'Post a SAVED document — runs the posting logic, writes accumulation and information register entries, and transitions status SAVED → POSTED. Acquires per-register advisory locks under Serializable isolation. Idempotent attempts on already-posted documents are rejected with `invalid_status`. Returns { movementCount }.';
  const documentUnpostDescription =
    'Unpost a POSTED document — soft-deactivates its register movements and transitions status POSTED → SAVED. Reverses `document_post` while preserving the audit trail. Idempotent attempts on already-saved documents are rejected with `invalid_status`. Returns { deactivatedCount }.';
  const documentCloneDescription =
    'Clone an existing document as a new SAVED draft. Engine-managed fields (id, number, status, postedAt, postedBy, createdAt, updatedAt, deletedAt, version, tenantId) are stripped; the surviving header columns and line sections are copied into a brand-new document with a freshly allocated number. The source can be SAVED or POSTED — the clone is always SAVED. Returns the created clone.';

  return `${HEADER}
${sharedImports(DOCUMENT_ENGINE_IMPORTS)}
const DOCUMENT_IDS = z.enum([${enumLiteral}]);

${REQUIRE_TENANT_FRAGMENT}

${requireAppContextFragment('createDocument, postDocument, …')}

function requireDocument(configId: string) {
  const cfg = getRegistry().document[configId];
  if (!cfg) throw new ToolError('not_found', \`unknown document: \${configId}\`);
  return cfg;
}

/**
 * Engine-managed columns stripped before re-creating a document during clone.
 * Mirrors the field list in \`cloneDocumentRecord\` (app/.../documents/[entity]/
 * actions.ts) so the two clone surfaces stay aligned.
 */
const CLONE_STRIP_FIELDS = [
  'id',
  'number',
  'status',
  'postedAt',
  'postedBy',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'version',
  'tenantId',
] as const;

export const documentListTool: ToolDefinition = {
  name: 'document_list',
  description: ${JSON.stringify(documentListDescription)},
  inputSchema: z.object({
    configId: DOCUMENT_IDS,
    page: z.number().int().min(1).max(10_000).default(1).optional(),
    pageSize: z.number().int().min(1).max(100).default(50).optional(),
    status: z.enum(['SAVED', 'POSTED']).optional(),
    search: z.string().max(200).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireDocument(input.configId);
    // Build an optional \`date\` window on top of the engine's generic \`where\`
    // bag. The engine merges this with its own scope filter + status/search,
    // so passing a partial range is safe.
    const dateWhere: Record<string, unknown> = {};
    if (input.dateFrom) dateWhere.gte = new Date(input.dateFrom);
    if (input.dateTo) dateWhere.lte = new Date(input.dateTo);
    const where = Object.keys(dateWhere).length ? { date: dateWhere } : undefined;
    const { rows, total, page, pageSize } = await listDocumentsPaged(appCtx as never, cfg, {
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 50,
      search: input.search,
      status: input.status,
      where,
    });
    return {
      rows: rows.map((r) => serializeRow(r)),
      total,
      page,
      pageSize,
    };
  },
};

export const documentGetTool: ToolDefinition = {
  name: 'document_get',
  description: ${JSON.stringify(documentGetDescription)},
  inputSchema: z.object({ configId: DOCUMENT_IDS, id: z.string().uuid() }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireDocument(input.configId);
    const row = await getDocument(appCtx as never, cfg, input.id);
    return serializeRow(row);
  },
};

export const documentCreateTool: ToolDefinition = {
  name: 'document_create',
  description: ${JSON.stringify(documentCreateDescription)},
  inputSchema: z.object({
    configId: DOCUMENT_IDS,
    fields: z.record(z.unknown()),
  }),
  requiredScope: 'write',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireDocument(input.configId);
    const created = await createDocument(appCtx as never, cfg, input.fields);
    // The engine writes a generic \`create\` audit row inside its own withBypass
    // tx. The MCP tool wrapper layers a channel-level \`api_create\` row with
    // \`source: 'mcp'\` so the audit dashboard can attribute the change to the
    // MCP delivery channel. Same dual-audit pattern as catalog_create.
    await writeAudit(null, appCtx as never, {
      entity: \`document.\${cfg.module}.\${cfg.name}\`,
      entityId: String(created.id),
      action: 'api_create',
      after: created,
      source: 'mcp',
      metadata: { correlationId: ctx.correlationId },
    });
    return serializeRow(created);
  },
};

export const documentPostTool: ToolDefinition = {
  name: 'document_post',
  description: ${JSON.stringify(documentPostDescription)},
  inputSchema: z.object({ configId: DOCUMENT_IDS, id: z.string().uuid() }),
  requiredScope: 'write',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireDocument(input.configId);
    const result = await postDocument(appCtx as never, cfg, input.id);
    await writeAudit(null, appCtx as never, {
      entity: \`document.\${cfg.module}.\${cfg.name}\`,
      entityId: input.id,
      action: 'api_post',
      source: 'mcp',
      metadata: { correlationId: ctx.correlationId },
    });
    return result;
  },
};

export const documentUnpostTool: ToolDefinition = {
  name: 'document_unpost',
  description: ${JSON.stringify(documentUnpostDescription)},
  inputSchema: z.object({ configId: DOCUMENT_IDS, id: z.string().uuid() }),
  requiredScope: 'write',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireDocument(input.configId);
    const result = await unpostDocument(appCtx as never, cfg, input.id);
    await writeAudit(null, appCtx as never, {
      entity: \`document.\${cfg.module}.\${cfg.name}\`,
      entityId: input.id,
      action: 'api_unpost',
      source: 'mcp',
      metadata: { correlationId: ctx.correlationId },
    });
    return result;
  },
};

export const documentCloneTool: ToolDefinition = {
  name: 'document_clone',
  description: ${JSON.stringify(documentCloneDescription)},
  inputSchema: z.object({ configId: DOCUMENT_IDS, sourceId: z.string().uuid() }),
  requiredScope: 'write',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    const cfg = requireDocument(input.configId);
    // ishflow has no dedicated \`cloneDocument\` engine helper. The pattern is:
    // load with lines, strip engine-managed fields, re-create. Same as
    // \`cloneDocumentRecord\` in app/.../documents/[entity]/actions.ts.
    const source = (await getDocument(appCtx as never, cfg, input.sourceId)) as Record<
      string,
      unknown
    >;
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(source)) {
      if ((CLONE_STRIP_FIELDS as readonly string[]).includes(k)) continue;
      rest[k] = v;
    }
    const created = await createDocument(appCtx as never, cfg, rest);
    await writeAudit(null, appCtx as never, {
      entity: \`document.\${cfg.module}.\${cfg.name}\`,
      entityId: String(created.id),
      action: 'api_create',
      after: created,
      source: 'mcp',
      metadata: { correlationId: ctx.correlationId },
    });
    return serializeRow(created);
  },
};

export const documentTools: ToolDefinition[] = [
  documentListTool,
  documentGetTool,
  documentCreateTool,
  documentPostTool,
  documentUnpostTool,
  documentCloneTool,
];
`;
}

export function generateDocumentToolsFile(): void {
  ensureOutDir();
  writeGeneratedFile('document-tools.ts', generateDocumentTools());
}
