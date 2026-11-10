import { describe, expect, it } from 'vitest';
import type { McpToolContext } from '../types';
import { pingTool } from './ping';

const fakeCtx = (overrides: Partial<McpToolContext> = {}): McpToolContext => ({
  tenantId: 'tenant-uuid',
  userId: 'user-uuid',
  apiKeyId: 'key-uuid',
  scope: 'read',
  locale: 'ru',
  correlationId: 'corr-uuid',
  ...overrides,
});

describe('pingTool', () => {
  it('returns ok + timestamp + version + tenantId', async () => {
    const before = Date.now();
    const result = await pingTool.handler({}, fakeCtx());
    const after = Date.now();
    expect(result.ok).toBe(true);
    expect(result.version).toBe('0.1.0');
    expect(result.tenantId).toBe('tenant-uuid');
    const ts = Date.parse(result.timestamp);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('passes through null tenantId', async () => {
    const result = await pingTool.handler({}, fakeCtx({ tenantId: null }));
    expect(result.tenantId).toBeNull();
  });

  it('exports a tool definition with name, description, and requiredScope', () => {
    expect(pingTool.name).toBe('ping');
    expect(typeof pingTool.description).toBe('string');
    expect(pingTool.description.length).toBeGreaterThan(10);
    expect(pingTool.requiredScope).toBe('read');
  });
});
