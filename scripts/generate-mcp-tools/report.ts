/**
 * Report tools codegen. Emits packages/mcp-tools/src/generated/report-tools.ts.
 *
 * No DSL: unlike catalogs / documents / registers, the report layer is a set
 * of hand-coded fetchers in `lib/reports/exporters.ts` keyed by the
 * `ReportType` union. There is no `defineReportView` / registry, so this
 * generator does NOT walk `getRegistry()`; it emits a static descriptor table
 * driven by the hard-coded `REPORTS` list below. Adding a new report =
 * add an entry here AND a fetcher in `lib/reports/exporters.ts`.
 *
 * Tools emitted:
 *   - `report_list` — returns id, title, description, paramSchema (as JSON
 *     Schema 7) for every report. No input.
 *   - `report_run` — dispatches by `reportId` to the matching fetcher and
 *     returns the tabular result `{ headers, rows }`.
 *
 * Both tools carry `requiredScope: 'read'`. The fetchers take an
 * `AppContext` (not a tx) and open their own `withTenant` transaction,
 * mirroring the pattern in `app/api/reports/<slug>/route.ts`.
 *
 * NB: this file does NOT use the `sharedImports` helper. Reports don't
 * touch the metadata registry and don't return Prisma rows (rows are arrays
 * of strings/numbers, pre-formatted by the fetchers), so importing
 * `getRegistry` / `serializeRow` would leave them unused. The imports block
 * is hand-rolled but kept structurally similar to the other generators.
 */
import { ensureOutDir, writeGeneratedFile } from './common';

/**
 * The complete set of reports MCP exposes, ordered alphabetically by id for
 * deterministic codegen output. Keep this in sync with the `ReportType` union
 * in `lib/reports/exporters.ts` — the codegen has no other source of truth.
 *
 * Each entry's `paramsZodSrc` is emitted verbatim into the generated file as
 * the Zod schema source. Keeping the schemas declarative-as-source (vs.
 * runtime Zod objects) is necessary because the generator runs at build time
 * and the emitted file must contain literal Zod calls, not serialised JSON.
 */
interface ReportDescriptor {
  id: string;
  title: string;
  /** Short prose for the `report_list` description and the LLM's grounding. */
  blurb: string;
  /** Zod schema source for the report's params. Emitted verbatim. */
  paramsZodSrc: string;
  /** Exported fetcher name in `lib/reports/exporters.ts`. */
  fetcher: string;
}

const REPORTS: ReportDescriptor[] = [
  {
    id: 'ap-aging',
    title: 'A/P Aging',
    blurb:
      'Outstanding payable balance per supplier, bucketed by days outstanding (current, 31-60, 61-90, 91-120, 120+). Snapshot as of now; no period parameters.',
    paramsZodSrc: 'z.object({})',
    fetcher: 'fetchAPAgingRows',
  },
  {
    id: 'ar-aging',
    title: 'A/R Aging',
    blurb:
      'Outstanding receivable balance per customer, bucketed by days outstanding (current, 31-60, 61-90, 91-120, 120+). Snapshot as of now; no period parameters.',
    paramsZodSrc: 'z.object({})',
    fetcher: 'fetchARAgingRows',
  },
  {
    id: 'gross-profit',
    title: 'Gross Profit',
    blurb:
      'Quantity, revenue, cost, margin and margin % grouped by an arbitrary stack of dimensions (counterparty, product, category, group). Pass `dims` to choose the grouping stack, plus per-dimension filter keys (`f.counterparty`, `f.product`, `f.category`, `f.group`) as comma-separated id lists. Defaults to month-to-date and "no grouping" (flat totals row).',
    // `catchall(z.string())` permits the `f.<dim>` filter keys whose names are
    // dynamic; the fetcher reads them off the params bag.
    paramsZodSrc:
      "z.object({\n    from: z.string().datetime().optional(),\n    to: z.string().datetime().optional(),\n    dims: z.array(z.enum(['counterparty', 'product', 'category', 'group'])).optional(),\n  }).catchall(z.string())",
    fetcher: 'fetchGrossProfitRows',
  },
  {
    id: 'sales-by-customer',
    title: 'Sales by Customer',
    blurb:
      'Revenue, cost, margin, margin %, and quantity per customer over a date range. Defaults to month-to-date.',
    paramsZodSrc:
      'z.object({\n    from: z.string().datetime().optional(),\n    to: z.string().datetime().optional(),\n  })',
    fetcher: 'fetchSalesByCustomerRows',
  },
  {
    id: 'sales-by-product',
    title: 'Sales by Product',
    blurb:
      'Revenue, cost, margin, margin %, and quantity per product over a date range. Defaults to month-to-date.',
    paramsZodSrc:
      'z.object({\n    from: z.string().datetime().optional(),\n    to: z.string().datetime().optional(),\n  })',
    fetcher: 'fetchSalesByProductRows',
  },
];

const HEADER = `// GENERATED FILE — do not edit by hand. Run \`pnpm generate:mcp\` to regenerate.
// Source: scripts/generate-mcp-tools/report.ts emits a static descriptor table
// because the report layer has no DSL / registry — fetchers are hand-coded in
// lib/reports/exporters.ts and keyed by the \`ReportType\` union.
//
// The 2 report tools are polymorphic over \`reportId\` so a single tool
// definition covers every report. Per-report parameter shapes ARE validated
// in the MCP inputSchema (unlike catalogs/documents where the engine
// validates) because the report params are small, well-known, and the LLM
// benefits from a concrete schema per report.
//
// Engine boundary: \`fetch*Rows\` helpers in lib/reports/exporters.ts take an
// AppContext (not a tx) and open their own \`withTenant\` transaction.
//
// Adding a new report: edit \`REPORTS\` in scripts/generate-mcp-tools/report.ts
// AND add a fetcher in lib/reports/exporters.ts (must be exported) — the
// switch arm below is auto-generated from the descriptor's \`fetcher\` field.
`;

/** Turn a hyphenated report id into a valid identifier for the Zod const name. */
function constName(reportId: string): string {
  return `${reportId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_PARAMS`;
}

function generateReportTools(): string {
  // Already alphabetical in the source array, but sort defensively so a
  // future inline edit can't reorder the emitted output.
  const reports = [...REPORTS].sort((a, b) => a.id.localeCompare(b.id));
  const enumLiteral = reports.map((r) => JSON.stringify(r.id)).join(', ');
  const reportsList = reports.map((r) => `\`${r.id}\``).join(', ');

  // Per-report Zod schema constants. Declared at module scope so both
  // `report_list` (for the JSON-Schema translation) and `report_run` (for
  // per-report re-validation) reference the same object.
  const paramSchemaConsts = reports
    .map((r) => `const ${constName(r.id)} = ${r.paramsZodSrc};`)
    .join('\n');

  // Build per-report descriptor literals for `report_list`. The JSON-Schema
  // translation is done at handler runtime (not codegen time) so the
  // generator stays free of any dependency on the runtime schema translator.
  const descriptorEntries = reports
    .map(
      (r) =>
        `      {
        id: ${JSON.stringify(r.id)},
        title: ${JSON.stringify(r.title)},
        description: ${JSON.stringify(r.blurb)},
        paramSchema: zodToJsonSchema(${constName(r.id)}),
      },`,
    )
    .join('\n');

  // Switch arms for `report_run`. Each parses the per-report schema, coerces
  // ISO date strings to Date objects, then invokes the matching fetcher.
  const runSwitchArms = reports
    .map(
      (r) => `      case ${JSON.stringify(r.id)}: {
        const parsed = ${constName(r.id)}.parse(input.params ?? {}) as Record<string, unknown>;
        const fetchParams = coerceDates(parsed);
        const { headers, rows } = await ${r.fetcher}(fetchParams, appCtx as never);
        return { headers, rows };
      }`,
    )
    .join('\n');

  // Imports for the fetchers — all five live in lib/reports/exporters.ts.
  const fetcherImports = reports.map((r) => `  ${r.fetcher},`).join('\n');

  return `${HEADER}
import { z } from 'zod';
import { ToolError } from '../error-map';
import type { McpAppContext, ToolDefinition } from '../types';
import {
${fetcherImports}
} from '@/lib/reports/exporters';
import { zodToJsonSchema } from '../zod-to-json-schema';

const REPORT_IDS = z.enum([${enumLiteral}]);

${paramSchemaConsts}

/**
 * Type-narrowing guard for the request-scoped tenant id. Throws
 * \`tenant_required\` (a dedicated ToolErrorCode, not \`forbidden\`) so error
 * dashboards can distinguish "key has no tenant binding" from "scope rank too
 * low". The translated message lives under \`tool.errors.tenant_required\` in
 * the MCP i18n catalog.
 */
function requireTenant(tenantId: string | null): string {
  if (!tenantId) throw new ToolError('tenant_required', '__t:tool.errors.tenant_required');
  return tenantId;
}

/**
 * The report fetchers (fetchARAgingRows, fetchSalesByCustomerRows, …) take a
 * full AppContext with \`tenant\`, \`user\`, \`permissions\`, etc. The MCP route
 * forwards that AppContext through \`ctx.appContext\` so tool handlers never
 * need to re-resolve auth. If the field is missing we abort with
 * \`internal_error\` — this should never happen because the route always
 * attaches it, but guarding catches contract drift early.
 *
 * The cast to \`never\` at the fetcher-call boundary is deliberate: this
 * generated file is kept structurally isolated from the app's \`AppContext\`
 * shape (no \`@/platform/auth/current-context\` import) so the
 * \`@ishflow/mcp-tools\` package stays a leaf. The route adapter forwards the
 * real concrete AppContext via \`McpAppContext\`; the cast bridges the
 * narrower structural type back to whatever the fetchers accept.
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

/**
 * Re-hydrate ISO date strings into Date objects so the report fetchers (which
 * key on \`Date\` instances, not strings) accept the params unchanged. Any
 * non-date string keys pass through untouched. Done at the MCP boundary so
 * the fetchers stay storage-typed.
 */
function coerceDates(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...params };
  if (typeof out.from === 'string') out.from = new Date(out.from);
  if (typeof out.to === 'string') out.to = new Date(out.to);
  return out;
}

export const reportListTool: ToolDefinition = {
  name: 'report_list',
  description: ${JSON.stringify(
    `List every available report with its id, title, prose description, and a JSON Schema for its params. Use this before calling \`report_run\` to discover which reports exist and what parameters they accept. Supported reportIds: ${reportsList}.`,
  )},
  inputSchema: z.object({}),
  requiredScope: 'read',
  handler: async (_input, ctx) => {
    requireTenant(ctx.tenantId);
    requireAppContext(ctx.appContext);
    return [
${descriptorEntries}
    ];
  },
};

export const reportRunTool: ToolDefinition = {
  name: 'report_run',
  description: ${JSON.stringify(
    `Run a registered report with optional parameters and return the result as { headers, rows } where rows is an array of arrays mirroring the headers' column order. Use \`report_list\` first to discover available reportIds and their paramSchemas. Supported reportIds: ${reportsList}. Date params are ISO 8601 strings; the handler coerces them to Date instances before invoking the fetcher.`,
  )},
  inputSchema: z.object({
    reportId: REPORT_IDS,
    params: z.record(z.unknown()).optional(),
  }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    switch (input.reportId) {
${runSwitchArms}
      default: {
        // Exhaustiveness check — Zod's enum already rejects unknown ids at
        // the schema layer, but the throw guards against future enum drift.
        throw new ToolError('not_found', \`unknown report: \${input.reportId as string}\`);
      }
    }
  },
};

export const reportTools: ToolDefinition[] = [reportListTool, reportRunTool];
`;
}

export function generateReportToolsFile(): void {
  ensureOutDir();
  writeGeneratedFile('report-tools.ts', generateReportTools());
}
