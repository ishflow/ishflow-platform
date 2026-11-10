import { z } from 'zod';
import type { ToolDefinition } from '../types';
import { MCP_TOOLS_VERSION } from '../version';

export const pingTool: ToolDefinition<
  z.ZodObject<Record<string, never>>,
  { ok: true; version: string; timestamp: string; tenantId: string | null }
> = {
  name: 'ping',
  description:
    'Liveness probe. Returns the server version, current timestamp, and the authenticated tenant id. Use to verify the MCP connection is healthy before issuing real tool calls.',
  inputSchema: z.object({}),
  requiredScope: 'read',
  handler: async (_input, ctx) => ({
    ok: true,
    version: MCP_TOOLS_VERSION,
    timestamp: new Date().toISOString(),
    tenantId: ctx.tenantId,
  }),
};
