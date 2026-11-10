import type { ApiKeyScope } from '@prisma/client';
import type { z, ZodTypeAny } from 'zod';

/**
 * Structural shape of `AppContext` from `platform/auth/current-context.ts`.
 * Declared structurally (not imported) so this package can stay a leaf with
 * no dependency on the app's Clerk / Prisma surface — the route adapter
 * casts the concrete `AppContext` to this shape when minting `McpToolContext`.
 *
 * Catalog / document / register tools require the full context (permissions,
 * scopes, tenant row) because the engine helpers in `platform/engine/crud.ts`
 * take an `AppContext`, not a transaction. Ping-style tools that don't touch
 * the engine ignore this field.
 *
 * Design choice: the generated catalog tools deliberately do NOT import
 * `AppContext` from `@/platform/auth/current-context`. Instead they accept
 * `McpAppContext` and cast (`as never`) at each engine-helper call so the
 * generated file stays free of platform-leaf imports. The cast is safe at
 * runtime because the route adapter forwards the real concrete `AppContext`
 * (see app/api/mcp/route.ts). If a future tool needs the full typed
 * `AppContext` at the type level, narrow it inline in that tool rather than
 * leaking the import into the shared types file.
 */
export type McpAppContext = {
  /**
   * `clerkId` is optional in this structural type because some test fixtures
   * construct a minimal AppContext without it. The route adapter always
   * forwards the real AppContext (which carries both fields), so super-admin
   * tool handlers can rely on both being present at runtime and validate via
   * `requireActor` in `super-admin/common.ts`.
   */
  user: { id: string; clerkId?: string };
  tenant: { id: string } | null;
  permissions: Set<string>;
  // Allow the full AppContext to slot in without TypeScript narrowing the
  // shape — we only enumerate the fields the MCP layer reads.
  [key: string]: unknown;
};

/**
 * Per-call context handed to every tool handler. Built once per HTTP request
 * by `app/api/mcp/route.ts` after `requireApiKey` succeeds, then passed
 * verbatim to `dispatchTool` for every JSON-RPC `tools/call` in that request.
 *
 * `tenantId` is null only for super-admin tools that target arbitrary tenants.
 * `userId` is null only when a key was minted for a service account (no
 * `createdBy` relation — not currently possible in the schema but kept in the
 * type for future flexibility).
 */
export interface McpToolContext {
  /** Tenant the API key is scoped to. null only for super-admin tools that target arbitrary tenants. */
  tenantId: string | null;
  /** User attached to the API key (creator), null if the key was minted for a service account. */
  userId: string | null;
  apiKeyId: string;
  scope: ApiKeyScope;
  /** Resolved from Accept-Language header. Defaults to 'ru'. */
  locale: string;
  /** Correlation id for log / audit cross-referencing within one tool call. */
  correlationId: string;
  /**
   * Full resolved `AppContext` from the API-key bearer dispatch. Required by
   * catalog / document / register tools so they can call the engine helpers
   * (`createRecord`, `getRecord`, …) which take an `AppContext` (not a tx).
   *
   * Optional in the type to keep unit tests of low-level tools (ping, error
   * map) ergonomic — they don't touch the engine and don't need it.
   */
  appContext?: McpAppContext;
}

export interface ToolDefinition<S extends ZodTypeAny = ZodTypeAny, R = unknown> {
  name: string;
  description: string;
  inputSchema: S;
  requiredScope: ApiKeyScope;
  handler: (input: z.infer<S>, ctx: McpToolContext) => Promise<R>;
}
