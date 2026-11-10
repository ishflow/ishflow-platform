import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { ToolError } from './error-map';
import { dispatchTool, listTools } from './server';
import type { McpToolContext } from './types';

const baseCtx = (overrides: Partial<McpToolContext> = {}): McpToolContext => ({
  tenantId: 'tenant-uuid',
  userId: 'user-uuid',
  apiKeyId: 'key-uuid',
  scope: 'read',
  locale: 'ru',
  correlationId: 'corr-uuid',
  ...overrides,
});

describe('listTools', () => {
  it('returns at least the ping tool with a non-empty description', () => {
    const tools = listTools();
    const ping = tools.find((t) => t.name === 'ping');
    expect(ping).toBeDefined();
    if (!ping) return;
    expect(ping.description.length).toBeGreaterThan(10);
  });
});

describe('dispatchTool', () => {
  it('routes ping to the ping tool when scope allows', async () => {
    const result = await dispatchTool('ping', {}, baseCtx({ scope: 'read' }));
    expect((result as { ok: boolean }).ok).toBe(true);
  });

  it('passes ctx.tenantId through to the ping handler', async () => {
    const result = (await dispatchTool('ping', {}, baseCtx({ tenantId: 'tenant-42' }))) as {
      tenantId: string | null;
    };
    expect(result.tenantId).toBe('tenant-42');
  });

  it('rejects unknown tools with ToolError(not_found)', async () => {
    await expect(dispatchTool('totally_made_up_tool', {}, baseCtx())).rejects.toBeInstanceOf(
      ToolError,
    );
    await expect(dispatchTool('totally_made_up_tool', {}, baseCtx())).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('rejects write-scope tool when caller only holds read', async () => {
    // `catalog_create` is a write tool registered by Task 5. A read-scope key
    // must be refused with ToolError(forbidden) BEFORE the handler runs — the
    // Zod parse must not even execute, otherwise a read key could probe the
    // tool's input shape.
    await expect(
      dispatchTool(
        'catalog_create',
        { configId: 'sales.customer', fields: { name: 'x' } },
        baseCtx({ scope: 'read' }),
      ),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('lists at least ping + 5 catalog tools', () => {
    const tools = listTools();
    expect(tools.length).toBeGreaterThanOrEqual(6);
    const names = tools.map((t) => t.name);
    expect(names).toContain('ping');
    expect(names).toContain('catalog_list');
    expect(names).toContain('catalog_create');
  });

  it('validates input via the tool schema with ZodError on bad shapes', async () => {
    // Ping accepts an empty object. A string must fail Zod parse with a
    // ZodError specifically — a weaker assertion (`.toBeDefined()`) would
    // green even if the dispatcher silently bypassed validation.
    await expect(dispatchTool('ping', 'not-an-object', baseCtx())).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});
