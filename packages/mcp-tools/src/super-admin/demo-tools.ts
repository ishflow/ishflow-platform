/**
 * Demo super-admin tools — hand-written MCP wrappers around demo-tenant
 * seeding helpers.
 *
 * All 1 tool requires ApiKeyScope `platform_admin`. The MCP route's auth
 * floor is `read`; per-tool scope is enforced inside `dispatchTool` via
 * `requiredScope`. A read or write key naming this tool is rejected with
 * `forbidden` before the handler runs.
 *
 * Deferred tools (Phase 2):
 *   - `demo_seed_tenant` — no callable platform helper or `.mjs` seed
 *     script exists on this branch. The historical Faz dev.1 seed script
 *     (not included in this repo) was committed on the v2 line
 *     and has not been ported to `feat/mcp-server`; the directory listing
 *     is empty. A thin TypeScript wrapper would require the seed module
 *     to ship first. Tool is registered (stable MCP surface) but its
 *     handler throws `precondition_failed`. Hook up in Phase 2 once a
 *     `seedDemoTenant({ slug, plan, scope })` helper lands under
 *     `platform/super-admin/`.
 */
import { z } from 'zod';
import { ToolError } from '../error-map';
import type { ToolDefinition } from '../types';

const DemoScopeEnum = z.enum(['minimal', 'standard', 'full']);

export const demoSeedTenantTool: ToolDefinition = {
  name: 'demo_seed_tenant',
  description:
    'Provision a demo tenant with seeded reference data (currencies, catalogs, sample documents). `scope` controls fixture depth — `minimal` seeds only currencies + 1 owner, `standard` adds catalogs + 5 documents, `full` adds 30 days of activity. `slug` must be globally unique; collision returns conflict. DEFERRED to Phase 2 — no leaf-importable seed helper exists on this branch. Calling this tool today returns precondition_failed.',
  inputSchema: z.object({
    slug: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[a-z0-9-]+$/, 'must be lowercase a-z, 0-9, and hyphens only'),
    name: z.string().min(1).max(120),
    ownerEmail: z.string().email(),
    scope: DemoScopeEnum.optional(),
    plan: z.enum(['free', 'starter', 'pro', 'business', 'enterprise']).optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async () => {
    throw new ToolError(
      'precondition_failed',
      'demo_seed_tenant is deferred to Phase 2 — no leaf-importable seed helper exists on this branch',
    );
  },
};

/**
 * Tool registry.
 * `server.ts` spreads this array into the global tool list.
 */
export const demoTools: ToolDefinition[] = [demoSeedTenantTool];
