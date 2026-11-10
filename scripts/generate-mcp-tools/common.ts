/**
 * Shared building blocks for the per-domain MCP codegen modules under
 * `scripts/generate-mcp-tools/`. The pieces exported here are the byte-identical
 * fragments that would otherwise be copy-pasted into each domain generator
 * (catalog, document, and the upcoming register / report tools).
 *
 * Output discipline: the goal of these helpers is that the per-domain emitters
 * stay short and structurally similar. Any string returned from here is part of
 * the generated file's surface — changing it forces every domain to be
 * regenerated.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const OUT_DIR = resolve('packages/mcp-tools/src/generated');

/**
 * Ensures the output directory exists. Idempotent — safe to call from each
 * domain generator before writing.
 */
export function ensureOutDir(): void {
  mkdirSync(OUT_DIR, { recursive: true });
}

/**
 * Build the shared imports block for a generated tools file. The set of engine
 * helpers differs per domain, so it's passed in as a literal multi-line import
 * statement (or statements). The leading lines (zod, ToolError, types,
 * registry, serialize) are byte-identical across domains.
 *
 * `includeAudit` controls whether `writeAudit` is imported — domains that
 * never mutate (e.g. register reads) leave it out so the import doesn't trip
 * the unused-import typecheck. Defaults to `true` because catalog + document
 * both layer `api_*` audit rows on every mutation.
 */
export function sharedImports(
  domainEngineImports: string,
  options: { includeAudit?: boolean } = {},
): string {
  const includeAudit = options.includeAudit ?? true;
  const auditImport = includeAudit
    ? "import { writeAudit } from '@/platform/engine/audit-log';\n"
    : '';
  return `import { z } from 'zod';
import { ToolError } from '../error-map';
import type { McpAppContext, ToolDefinition } from '../types';
${domainEngineImports}
${auditImport}import { getRegistry } from '@/platform/metadata/registry';
import { serializeRow } from '@/app/api/v1/_lib/serialize';
`;
}

/**
 * The `requireTenant` helper is byte-identical across every generated file —
 * same signature, same throw, same i18n key. Emitted as a single shared
 * fragment so a future contract change (rename of `tenant_required`, key
 * relocation in the MCP i18n catalog) touches one place.
 */
export const REQUIRE_TENANT_FRAGMENT = `/**
 * Type-narrowing guard for the request-scoped tenant id. Throws
 * \`tenant_required\` (a dedicated ToolErrorCode, not \`forbidden\`) so error
 * dashboards can distinguish "key has no tenant binding" from "scope rank too
 * low". The translated message lives under \`tool.errors.tenant_required\` in
 * the MCP i18n catalog.
 */
function requireTenant(tenantId: string | null): string {
  if (!tenantId) throw new ToolError('tenant_required', '__t:tool.errors.tenant_required');
  return tenantId;
}`;

/**
 * Build the `requireAppContext` helper fragment. The body + signature are
 * byte-identical across domains; only the example helpers cited in the leading
 * docblock differ (catalog cites \`createRecord, getRecord, …\`, document cites
 * \`createDocument, postDocument, …\`). The caller passes that example string
 * so the comment matches the domain.
 */
export function requireAppContextFragment(exampleHelpers: string): string {
  return `/**
 * The engine helpers (${exampleHelpers}) take a full AppContext
 * with \`permissions\`, \`scopesByEntity\`, \`tenant\`, \`user\`, \`addons\`,
 * etc. The MCP route forwards that AppContext through \`ctx.appContext\` so
 * tool handlers never need to re-resolve auth. If the field is missing we
 * abort with \`internal_error\` — this should never happen because the route
 * always attaches it, but guarding catches contract drift early.
 *
 * The cast to \`never\` at the engine-call boundary is deliberate: this
 * generated file is kept structurally isolated from the app's
 * \`AppContext\` shape (no \`@/platform/auth/current-context\` import) so the
 * \`@ishflow/mcp-tools\` package stays a leaf. The route adapter forwards
 * the real concrete AppContext via \`McpAppContext\`; the cast bridges the
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
}`;
}

/**
 * Write a generated file to OUT_DIR and log the path. Centralised so the
 * "Wrote …" line stays consistent across domains (and the contract test for
 * regen output can grep for it).
 */
export function writeGeneratedFile(name: string, content: string): void {
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, content, 'utf8');
  process.stdout.write(`Wrote ${path}\n`);
}
