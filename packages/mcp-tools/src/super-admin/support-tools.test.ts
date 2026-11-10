/**
 * Surface tests over the hand-written support super-admin tools. Locks in
 * the 5-tool contract (names, descriptions, platform_admin scope) and the
 * per-tool input-schema guards (UUID validation, status enum, resolution
 * length). Engine behaviour itself is N/A — reads use plain prisma against
 * an RLS-free table, writes are all deferred.
 *
 * Deferred tools (`support_ticket_assign_to_me`, `support_ticket_close`,
 * `support_ticket_link_tenant`) are asserted to throw `precondition_failed`
 * at handler time so a future un-defer doesn't slip through without
 * updating tests.
 */
import { describe, expect, it } from 'vitest';
import { ToolError } from '../error-map';
import type { McpToolContext } from '../types';
import { supportTools } from './support-tools';

const EXPECTED_NAMES = [
  'support_ticket_assign_to_me',
  'support_ticket_close',
  'support_ticket_get',
  'support_ticket_link_tenant',
  'support_ticket_list',
];

const SAMPLE_UUID = '00000000-0000-0000-0000-000000000000';

function makeCtx(): McpToolContext {
  return {
    tenantId: null,
    userId: SAMPLE_UUID,
    apiKeyId: 'k1',
    scope: 'platform_admin',
    locale: 'en',
    correlationId: 'cid-test',
    appContext: {
      user: { id: SAMPLE_UUID, clerkId: 'user_test' },
      tenant: null,
      permissions: new Set<string>(),
    },
  };
}

describe('support super-admin tools', () => {
  it('exports exactly 5 tools with the expected names', () => {
    expect(supportTools).toHaveLength(5);
    expect(supportTools.map((t) => t.name).sort()).toEqual(EXPECTED_NAMES);
  });

  it('every tool requires platform_admin scope', () => {
    for (const t of supportTools) {
      expect(t.requiredScope).toBe('platform_admin');
    }
  });

  it('every tool has a meaningfully populated description', () => {
    for (const t of supportTools) {
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('support_ticket_list accepts empty input and all filter combinations', () => {
    const t = supportTools.find((x) => x.name === 'support_ticket_list');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
    expect(t?.inputSchema.safeParse({ status: 'open' }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ status: 'in_progress' }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ status: 'resolved' }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ status: 'wont_fix' }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID }).success).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        status: 'open',
        tenantId: SAMPLE_UUID,
        limit: 100,
        cursor: SAMPLE_UUID,
      }).success,
    ).toBe(true);
  });

  it('support_ticket_list rejects invalid filter values', () => {
    const t = supportTools.find((x) => x.name === 'support_ticket_list');
    expect(t?.inputSchema.safeParse({ status: 'pending' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ tenantId: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ limit: 201 }).success).toBe(false);
  });

  it('support_ticket_get requires a UUID ticketId', () => {
    const t = supportTools.find((x) => x.name === 'support_ticket_get');
    expect(t?.inputSchema.safeParse({ ticketId: SAMPLE_UUID }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ ticketId: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({}).success).toBe(false);
  });

  it('support_ticket_assign_to_me validates UUID and throws precondition_failed at handler', async () => {
    const t = supportTools.find((x) => x.name === 'support_ticket_assign_to_me');
    expect(t?.inputSchema.safeParse({ ticketId: 'bad' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ ticketId: SAMPLE_UUID }).success).toBe(true);

    const input = { ticketId: SAMPLE_UUID };
    await expect(t?.handler(input, makeCtx())).rejects.toBeInstanceOf(ToolError);
    await expect(t?.handler(input, makeCtx())).rejects.toMatchObject({
      code: 'precondition_failed',
    });
  });

  it('support_ticket_close requires ticketId + resolution and rejects invalid status', async () => {
    const t = supportTools.find((x) => x.name === 'support_ticket_close');
    expect(
      t?.inputSchema.safeParse({
        ticketId: SAMPLE_UUID,
        resolution: 'fixed in deploy 2026-05-25',
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        ticketId: SAMPLE_UUID,
        resolution: 'duplicate',
        status: 'wont_fix',
      }).success,
    ).toBe(true);
    expect(t?.inputSchema.safeParse({ ticketId: SAMPLE_UUID }).success).toBe(false);
    expect(
      t?.inputSchema.safeParse({
        ticketId: SAMPLE_UUID,
        resolution: '',
      }).success,
    ).toBe(false);
    expect(
      t?.inputSchema.safeParse({
        ticketId: SAMPLE_UUID,
        resolution: 'fixed',
        status: 'open',
      }).success,
    ).toBe(false);

    const input = { ticketId: SAMPLE_UUID, resolution: 'fixed' };
    await expect(t?.handler(input, makeCtx())).rejects.toBeInstanceOf(ToolError);
    await expect(t?.handler(input, makeCtx())).rejects.toMatchObject({
      code: 'precondition_failed',
    });
  });

  it('support_ticket_link_tenant requires both UUIDs and throws precondition_failed at handler', async () => {
    const t = supportTools.find((x) => x.name === 'support_ticket_link_tenant');
    expect(
      t?.inputSchema.safeParse({ ticketId: SAMPLE_UUID, tenantId: SAMPLE_UUID }).success,
    ).toBe(true);
    expect(t?.inputSchema.safeParse({ ticketId: SAMPLE_UUID }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID }).success).toBe(false);
    expect(
      t?.inputSchema.safeParse({ ticketId: 'bad', tenantId: SAMPLE_UUID }).success,
    ).toBe(false);

    const input = { ticketId: SAMPLE_UUID, tenantId: SAMPLE_UUID };
    await expect(t?.handler(input, makeCtx())).rejects.toBeInstanceOf(ToolError);
    await expect(t?.handler(input, makeCtx())).rejects.toMatchObject({
      code: 'precondition_failed',
    });
  });
});
