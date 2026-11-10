// GENERATED FILE — do not edit by hand. Run `pnpm generate:mcp` to regenerate.
// Source: scripts/generate-mcp-tools/report.ts emits a static descriptor table
// because the report layer has no DSL / registry — fetchers are hand-coded in
// lib/reports/exporters.ts and keyed by the `ReportType` union.
//
// The 2 report tools are polymorphic over `reportId` so a single tool
// definition covers every report. Per-report parameter shapes ARE validated
// in the MCP inputSchema (unlike catalogs/documents where the engine
// validates) because the report params are small, well-known, and the LLM
// benefits from a concrete schema per report.
//
// Engine boundary: `fetch*Rows` helpers in lib/reports/exporters.ts take an
// AppContext (not a tx) and open their own `withTenant` transaction.
//
// Adding a new report: edit `REPORTS` in scripts/generate-mcp-tools/report.ts
// AND add a fetcher in lib/reports/exporters.ts (must be exported) — the
// switch arm below is auto-generated from the descriptor's `fetcher` field.

import { z } from 'zod';
import { ToolError } from '../error-map';
import type { McpAppContext, ToolDefinition } from '../types';
import {
  fetchAPAgingRows,
  fetchARAgingRows,
  fetchGrossProfitRows,
  fetchSalesByCustomerRows,
  fetchSalesByProductRows,
} from '@/lib/reports/exporters';
import { zodToJsonSchema } from '../zod-to-json-schema';

const REPORT_IDS = z.enum(["ap-aging", "ar-aging", "gross-profit", "sales-by-customer", "sales-by-product"]);

const AP_AGING_PARAMS = z.object({});
const AR_AGING_PARAMS = z.object({});
const GROSS_PROFIT_PARAMS = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    dims: z.array(z.enum(['counterparty', 'product', 'category', 'group'])).optional(),
  }).catchall(z.string());
const SALES_BY_CUSTOMER_PARAMS = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  });
const SALES_BY_PRODUCT_PARAMS = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  });

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
 * The report fetchers (fetchARAgingRows, fetchSalesByCustomerRows, …) take a
 * full AppContext with `tenant`, `user`, `permissions`, etc. The MCP route
 * forwards that AppContext through `ctx.appContext` so tool handlers never
 * need to re-resolve auth. If the field is missing we abort with
 * `internal_error` — this should never happen because the route always
 * attaches it, but guarding catches contract drift early.
 *
 * The cast to `never` at the fetcher-call boundary is deliberate: this
 * generated file is kept structurally isolated from the app's `AppContext`
 * shape (no `@/platform/auth/current-context` import) so the
 * `@ishflow/mcp-tools` package stays a leaf. The route adapter forwards the
 * real concrete AppContext via `McpAppContext`; the cast bridges the
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
 * key on `Date` instances, not strings) accept the params unchanged. Any
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
  description: "List every available report with its id, title, prose description, and a JSON Schema for its params. Use this before calling `report_run` to discover which reports exist and what parameters they accept. Supported reportIds: `ap-aging`, `ar-aging`, `gross-profit`, `sales-by-customer`, `sales-by-product`.",
  inputSchema: z.object({}),
  requiredScope: 'read',
  handler: async (_input, ctx) => {
    requireTenant(ctx.tenantId);
    requireAppContext(ctx.appContext);
    return [
      {
        id: "ap-aging",
        title: "A/P Aging",
        description: "Outstanding payable balance per supplier, bucketed by days outstanding (current, 31-60, 61-90, 91-120, 120+). Snapshot as of now; no period parameters.",
        paramSchema: zodToJsonSchema(AP_AGING_PARAMS),
      },
      {
        id: "ar-aging",
        title: "A/R Aging",
        description: "Outstanding receivable balance per customer, bucketed by days outstanding (current, 31-60, 61-90, 91-120, 120+). Snapshot as of now; no period parameters.",
        paramSchema: zodToJsonSchema(AR_AGING_PARAMS),
      },
      {
        id: "gross-profit",
        title: "Gross Profit",
        description: "Quantity, revenue, cost, margin and margin % grouped by an arbitrary stack of dimensions (counterparty, product, category, group). Pass `dims` to choose the grouping stack, plus per-dimension filter keys (`f.counterparty`, `f.product`, `f.category`, `f.group`) as comma-separated id lists. Defaults to month-to-date and \"no grouping\" (flat totals row).",
        paramSchema: zodToJsonSchema(GROSS_PROFIT_PARAMS),
      },
      {
        id: "sales-by-customer",
        title: "Sales by Customer",
        description: "Revenue, cost, margin, margin %, and quantity per customer over a date range. Defaults to month-to-date.",
        paramSchema: zodToJsonSchema(SALES_BY_CUSTOMER_PARAMS),
      },
      {
        id: "sales-by-product",
        title: "Sales by Product",
        description: "Revenue, cost, margin, margin %, and quantity per product over a date range. Defaults to month-to-date.",
        paramSchema: zodToJsonSchema(SALES_BY_PRODUCT_PARAMS),
      },
    ];
  },
};

export const reportRunTool: ToolDefinition = {
  name: 'report_run',
  description: "Run a registered report with optional parameters and return the result as { headers, rows } where rows is an array of arrays mirroring the headers' column order. Use `report_list` first to discover available reportIds and their paramSchemas. Supported reportIds: `ap-aging`, `ar-aging`, `gross-profit`, `sales-by-customer`, `sales-by-product`. Date params are ISO 8601 strings; the handler coerces them to Date instances before invoking the fetcher.",
  inputSchema: z.object({
    reportId: REPORT_IDS,
    params: z.record(z.unknown()).optional(),
  }),
  requiredScope: 'read',
  handler: async (input, ctx) => {
    requireTenant(ctx.tenantId);
    const appCtx = requireAppContext(ctx.appContext);
    switch (input.reportId) {
      case "ap-aging": {
        const parsed = AP_AGING_PARAMS.parse(input.params ?? {}) as Record<string, unknown>;
        const fetchParams = coerceDates(parsed);
        const { headers, rows } = await fetchAPAgingRows(fetchParams, appCtx as never);
        return { headers, rows };
      }
      case "ar-aging": {
        const parsed = AR_AGING_PARAMS.parse(input.params ?? {}) as Record<string, unknown>;
        const fetchParams = coerceDates(parsed);
        const { headers, rows } = await fetchARAgingRows(fetchParams, appCtx as never);
        return { headers, rows };
      }
      case "gross-profit": {
        const parsed = GROSS_PROFIT_PARAMS.parse(input.params ?? {}) as Record<string, unknown>;
        const fetchParams = coerceDates(parsed);
        const { headers, rows } = await fetchGrossProfitRows(fetchParams, appCtx as never);
        return { headers, rows };
      }
      case "sales-by-customer": {
        const parsed = SALES_BY_CUSTOMER_PARAMS.parse(input.params ?? {}) as Record<string, unknown>;
        const fetchParams = coerceDates(parsed);
        const { headers, rows } = await fetchSalesByCustomerRows(fetchParams, appCtx as never);
        return { headers, rows };
      }
      case "sales-by-product": {
        const parsed = SALES_BY_PRODUCT_PARAMS.parse(input.params ?? {}) as Record<string, unknown>;
        const fetchParams = coerceDates(parsed);
        const { headers, rows } = await fetchSalesByProductRows(fetchParams, appCtx as never);
        return { headers, rows };
      }
      default: {
        // Exhaustiveness check — Zod's enum already rejects unknown ids at
        // the schema layer, but the throw guards against future enum drift.
        throw new ToolError('not_found', `unknown report: ${input.reportId as string}`);
      }
    }
  },
};

export const reportTools: ToolDefinition[] = [reportListTool, reportRunTool];
