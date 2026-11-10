import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { mapErrorToToolResult, ToolError } from './error-map';
import { catalogTools } from './generated/catalog-tools';
import { documentTools } from './generated/document-tools';
import { registerTools } from './generated/register-tools';
import { reportTools } from './generated/report-tools';
import { auditTools } from './super-admin/audit-tools';
import { billingTools } from './super-admin/billing-tools';
import { demoTools } from './super-admin/demo-tools';
import { supportTools } from './super-admin/support-tools';
import { systemTools } from './super-admin/system-tools';
import { tenantTools } from './super-admin/tenant-tools';
import { userTools } from './super-admin/user-tools';
import { pingTool } from './tools/ping';
import type { McpToolContext, ToolDefinition } from './types';
import { MCP_TOOLS_VERSION } from './version';
import { zodToJsonSchema } from './zod-to-json-schema';

/**
 * Tool registry. Members keep their original `ToolDefinition<Schema, Result>`
 * generics on their exports; here we erase the variant generics through
 * `AnyTool` so a heterogeneous array stays type-safe at the call site.
 * `dispatchTool` re-validates input via the schema before invoking the
 * handler, so the erased type only loses static end-to-end inference, not
 * runtime safety.
 */
type AnyTool = ToolDefinition<z.ZodTypeAny, unknown>;

// `ToolDefinition` is invariant in its schema generic, so we cast each entry
// down to the erased `AnyTool` shape for the registry. Each tool's strongly
// typed export (`pingTool` etc.) still gives end-to-end inference for its
// handler body — the erasure only affects the dispatch-loop call site.
const TOOLS: AnyTool[] = [
  pingTool as unknown as AnyTool,
  ...(catalogTools as unknown as AnyTool[]),
  ...(documentTools as unknown as AnyTool[]),
  ...(registerTools as unknown as AnyTool[]),
  ...(reportTools as unknown as AnyTool[]),
  ...(tenantTools as unknown as AnyTool[]),
  ...(userTools as unknown as AnyTool[]),
  ...(systemTools as unknown as AnyTool[]),
  ...(auditTools as unknown as AnyTool[]),
  ...(billingTools as unknown as AnyTool[]),
  ...(supportTools as unknown as AnyTool[]),
  ...(demoTools as unknown as AnyTool[]),
];

const RANK = { read: 1, write: 2, platform_admin: 3 } as const;

/**
 * Return the tool catalog for the JSON-RPC `tools/list` method.
 *
 * Input schemas are translated from Zod to JSON Schema 7 via
 * `zod-to-json-schema` so MCP clients can prompt the LLM with concrete
 * argument shapes.
 */
export function listTools(): Array<{ name: string; description: string; inputSchema: object }> {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.inputSchema),
  }));
}

/**
 * Dispatch a JSON-RPC `tools/call` to the matching tool definition.
 *
 * Enforces — in order:
 *   1. Tool existence (`not_found` when the name is unknown).
 *   2. Scope rank (`forbidden` when the caller's key scope is strictly less
 *      than the tool's `requiredScope`; uses the same rank lattice as
 *      `canPerform` in `platform/api-keys/permissions.ts`).
 *   3. Input validation via the tool's Zod schema.
 *
 * Returns the handler's raw result. Callers (e.g. `createMcpServer`) are
 * responsible for wrapping success / error into the MCP transport envelope.
 */
export async function dispatchTool(
  name: string,
  rawInput: unknown,
  ctx: McpToolContext,
): Promise<unknown> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new ToolError('not_found', `unknown tool: ${name}`);
  }
  if (RANK[ctx.scope] < RANK[tool.requiredScope]) {
    throw new ToolError(
      'forbidden',
      `tool ${name} requires scope ${tool.requiredScope}, got ${ctx.scope}`,
    );
  }
  const input = tool.inputSchema.parse(rawInput);
  return tool.handler(input, ctx);
}

/**
 * Build an MCP `Server` instance bound to the given per-request context. The
 * server registers `tools/list` and `tools/call` handlers that delegate to
 * `listTools` / `dispatchTool` so unit tests can exercise the dispatch path
 * without a live transport.
 */
export function createMcpServer(ctx: McpToolContext): Server {
  const server = new Server(
    { name: 'ishflow-mcp', version: MCP_TOOLS_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listTools() }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    try {
      const result = await dispatchTool(req.params.name, req.params.arguments ?? {}, ctx);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    } catch (err) {
      const payload = mapErrorToToolResult(err, ctx.locale);
      return {
        isError: true,
        content: [{ type: 'text' as const, text: JSON.stringify({ error: payload }) }],
      };
    }
  });

  return server;
}
