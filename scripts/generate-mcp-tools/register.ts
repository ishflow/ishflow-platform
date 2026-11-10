/**
 * Register tools codegen. Emits packages/mcp-tools/src/generated/register-tools.ts
 * by walking getRegistry().accumulationRegister. Three polymorphic read tools —
 * balance / turnover / movements — over a shared `registerId` enum.
 *
 * Scope: AccumulationRegister only. Information registers (e.g.
 * `inventory.product_price`) have a separate engine surface
 * (platform/engine/information-register-query.ts) and a separate codegen
 * pass is deferred to a Phase-2 task.
 *
 * Engine boundary: balance / turnover / movement helpers in
 * `platform/engine/register-query.ts` take a Prisma transaction (`tx`), NOT an
 * `AppContext`. The emitted handlers therefore wrap each call in
 * `withTenant(tenantId, (tx) => …)` to enforce RLS at the GUC level, the same
 * pattern used by `app/api/reports/turnover/[register]/xlsx/route.ts`.
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
// Source: scripts/generate-mcp-tools.ts walks getRegistry().accumulationRegister.
//
// The 3 register tools are polymorphic over \`registerId\` so a single tool
// definition covers every accumulation register in the system. Per-register
// dimension and resource shapes are validated by the engine helpers in
// platform/engine/register-query.ts — see scripts/generate-mcp-tools.ts for
// the rationale (tool-description prompt budget).
//
// Engine boundary: register-query helpers take a Prisma tx (not an
// AppContext), so the handlers below open a \`withTenant\` transaction
// per call. The tenant id is taken from the MCP context — the route adapter
// guarantees it matches the bearer key's tenant binding.
//
// Information registers (e.g. \`inventory.product_price\`) are intentionally
// excluded — they have a distinct query surface
// (platform/engine/information-register-query.ts) and a separate Phase-2
// codegen pass.
`;

const REGISTER_ENGINE_IMPORTS = `import {
  balanceAsOf,
  listMovementsPaged,
  turnover,
} from '@/platform/engine/register-query';
import { withTenant } from '@/platform/db/tenant-context';`;

function generateRegisterTools(): string {
  const registry = getRegistry();
  const registerIds = Object.keys(registry.accumulationRegister).sort();
  if (registerIds.length === 0) {
    throw new Error(
      'generate-mcp-tools: getRegistry().accumulationRegister is empty. Did `import "@/configs"` populate the registry? ' +
        'If you renamed configs/index.ts, update the import in this script.',
    );
  }
  const enumLiteral = registerIds.map((id) => JSON.stringify(id)).join(', ');
  // Build a deterministic list of supported registerIds for each tool
  // description so the emitted prose never drifts from the enum.
  const registersList = registerIds.map((id) => `\`${id}\``).join(', ');
  const balanceDescription = `Compute the signed balance of an accumulation register's primary resource at an instant in time. Supported registerIds: ${registersList}. \`dims\` narrows the rows considered (e.g. { counterparty: '<uuid>', currency: 'USD' }); omit to balance across every dimension. \`asOf\` snapshots the balance at a past instant (omit for "now"). Returns { quantity }.`;
  const turnoverDescription = `Compute period turnover (opening, income, expense, closing) for an accumulation register's primary resource, grouped by dimensions. Supported registerIds: ${registersList}. \`dims\` filters movements before aggregation; \`groupBy\` is an array of dimension keys to group by (omit to group by every dimension of the register). Returns an array of rows, each with the grouped dimension values plus { opening, income, expense, closing }. Empty \`groupBy\` yields a single aggregate row.`;
  const movementsDescription = `List individual movements for an accumulation register, paginated and ordered by timestamp desc. Supported registerIds: ${registersList}. \`dims\` narrows by dimension values; \`from\`/\`to\` narrow by movement timestamp. Page size is clamped to [1, 200]. Inactive (soft-deleted by unposting) movements are excluded unless \`includeInactive\` is true. Returns { rows, total, page, pageSize }.`;

  return `${HEADER}
${sharedImports(REGISTER_ENGINE_IMPORTS, { includeAudit: false })}
const REGISTER_IDS = z.enum([${enumLiteral}]);

${REQUIRE_TENANT_FRAGMENT}

${requireAppContextFragment('balanceAsOf, turnover, listMovementsPaged')}

function requireAccumulationRegister(registerId: string) {
  const cfg = getRegistry().accumulationRegister[registerId];
  if (!cfg) throw new ToolError('not_found', \`unknown register: \${registerId}\`);
  return cfg;
}

export const registerBalanceTool: ToolDefinition = {
  name: 'register_balance',
  description: ${JSON.stringify(balanceDescription)},
  inputSchema: z.object({
    registerId: REGISTER_IDS,
    dims: z.record(z.unknown()).optional(),
    asOf: z.string().datetime().optional(),
  }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    const tenantId = requireTenant(ctx.tenantId);
    // \`appContext\` is forwarded by the route adapter but not consumed by the
    // register-query helpers — they take a Prisma tx. Touching it here keeps
    // the symmetry with catalog/document tools and triggers the same
    // \`internal_error\` if the route adapter ever drifts.
    requireAppContext(ctx.appContext);
    const cfg = requireAccumulationRegister(input.registerId);
    const asOf = input.asOf ? new Date(input.asOf) : new Date();
    return withTenant(tenantId, (tx) => balanceAsOf(tx, cfg, input.dims ?? {}, asOf));
  },
};

export const registerTurnoverTool: ToolDefinition = {
  name: 'register_turnover',
  description: ${JSON.stringify(turnoverDescription)},
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
  description: ${JSON.stringify(movementsDescription)},
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
    // the dim filter. \`listMovementsPaged\` strips any caller-supplied
    // \`active\` key so activation state stays controlled by \`includeInactive\`.
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
`;
}

export function generateRegisterToolsFile(): void {
  ensureOutDir();
  writeGeneratedFile('register-tools.ts', generateRegisterTools());
}
