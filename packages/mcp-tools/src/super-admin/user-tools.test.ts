/**
 * Surface tests over the hand-written user super-admin tools. Locks in
 * the 6-tool contract (names, descriptions, platform_admin scope) and the
 * per-tool input-schema guards (UUID validation, confirm:"YES" literal,
 * scope enum). Engine behaviour itself lives under `platform/**` tests —
 * we do not duplicate mutation assertions here.
 *
 * Deferred tools (`user_request_password_reset`, `user_revoke_all_sessions`)
 * are asserted to throw `precondition_failed` at handler time so a
 * future un-defer doesn't slip through without updating tests.
 */
import { describe, expect, it } from 'vitest';
import { ToolError } from '../error-map';
import type { McpToolContext } from '../types';
import { userTools } from './user-tools';

const EXPECTED_NAMES = [
  'user_get',
  'user_impersonate_token',
  'user_list',
  'user_request_password_reset',
  'user_revoke_all_sessions',
  'user_soft_delete',
];

const SAMPLE_UUID = '00000000-0000-0000-0000-000000000000';

// Minimal ctx — handlers that throw precondition_failed never read it;
// scope is set to platform_admin to mirror dispatch-time conditions.
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

describe('user super-admin tools', () => {
  it('exports exactly 6 tools with the expected names', () => {
    expect(userTools).toHaveLength(6);
    expect(userTools.map((t) => t.name).sort()).toEqual(EXPECTED_NAMES);
  });

  it('every tool requires platform_admin scope', () => {
    for (const t of userTools) {
      expect(t.requiredScope).toBe('platform_admin');
    }
  });

  it('every tool has a meaningfully populated description', () => {
    for (const t of userTools) {
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('user_list accepts an empty search string (engine returns [] for <2 chars)', () => {
    const t = userTools.find((x) => x.name === 'user_list');
    expect(t?.inputSchema.safeParse({ search: '' }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ search: 'foo' }).success).toBe(true);
  });

  it('user_list rejects over-long search strings', () => {
    const t = userTools.find((x) => x.name === 'user_list');
    expect(t?.inputSchema.safeParse({ search: 'x'.repeat(201) }).success).toBe(false);
  });

  it('user_get requires a UUID userId', () => {
    const t = userTools.find((x) => x.name === 'user_get');
    expect(t?.inputSchema.safeParse({ userId: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ userId: SAMPLE_UUID }).success).toBe(true);
  });

  it('user_soft_delete requires confirm:"YES" AND reason (min 3 chars)', () => {
    const t = userTools.find((x) => x.name === 'user_soft_delete');
    // Happy path.
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        reason: 'pii request',
        confirm: 'YES',
      }).success,
    ).toBe(true);
    // Missing confirm.
    expect(
      t?.inputSchema.safeParse({ userId: SAMPLE_UUID, reason: 'pii request' }).success,
    ).toBe(false);
    // Wrong confirm literal.
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        reason: 'pii request',
        confirm: 'maybe',
      }).success,
    ).toBe(false);
    // Reason too short.
    expect(
      t?.inputSchema.safeParse({ userId: SAMPLE_UUID, reason: 'no', confirm: 'YES' }).success,
    ).toBe(false);
    // Reason missing entirely.
    expect(
      t?.inputSchema.safeParse({ userId: SAMPLE_UUID, confirm: 'YES' }).success,
    ).toBe(false);
  });

  it('user_request_password_reset validates UUID and throws precondition_failed at handler', async () => {
    const t = userTools.find((x) => x.name === 'user_request_password_reset');
    expect(t?.inputSchema.safeParse({ userId: 'bad' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ userId: SAMPLE_UUID }).success).toBe(true);

    const input = { userId: SAMPLE_UUID };
    await expect(t?.handler(input, makeCtx())).rejects.toBeInstanceOf(ToolError);
    await expect(t?.handler(input, makeCtx())).rejects.toMatchObject({
      code: 'precondition_failed',
    });
  });

  it('user_revoke_all_sessions validates UUID and throws precondition_failed at handler', async () => {
    const t = userTools.find((x) => x.name === 'user_revoke_all_sessions');
    expect(t?.inputSchema.safeParse({ userId: 'bad' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ userId: SAMPLE_UUID }).success).toBe(true);

    const input = { userId: SAMPLE_UUID };
    await expect(t?.handler(input, makeCtx())).rejects.toBeInstanceOf(ToolError);
    await expect(t?.handler(input, makeCtx())).rejects.toMatchObject({
      code: 'precondition_failed',
    });
  });

  it('user_impersonate_token requires both userId AND tenantId as UUIDs', () => {
    const t = userTools.find((x) => x.name === 'user_impersonate_token');
    expect(
      t?.inputSchema.safeParse({ userId: SAMPLE_UUID, tenantId: SAMPLE_UUID }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({ userId: 'bad', tenantId: SAMPLE_UUID }).success,
    ).toBe(false);
    expect(
      t?.inputSchema.safeParse({ userId: SAMPLE_UUID, tenantId: 'bad' }).success,
    ).toBe(false);
  });

  it('user_impersonate_token accepts optional scope ∈ {read, write} but rejects platform_admin self-replication', () => {
    const t = userTools.find((x) => x.name === 'user_impersonate_token');
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        scope: 'read',
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        scope: 'write',
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        scope: 'platform_admin',
      }).success,
    ).toBe(false);
  });

  it('user_impersonate_token caps expiresInMinutes to 30 days', () => {
    const t = userTools.find((x) => x.name === 'user_impersonate_token');
    // 30d * 24h * 60m = 43200 (allowed).
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        expiresInMinutes: 60 * 24 * 30,
      }).success,
    ).toBe(true);
    // 30d + 1 minute (rejected).
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        expiresInMinutes: 60 * 24 * 30 + 1,
      }).success,
    ).toBe(false);
    // Zero / negative rejected.
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        expiresInMinutes: 0,
      }).success,
    ).toBe(false);
  });

  it('user_impersonate_token accepts optional name (1..80 chars)', () => {
    const t = userTools.find((x) => x.name === 'user_impersonate_token');
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        name: 'demo session',
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        name: '',
      }).success,
    ).toBe(false);
    expect(
      t?.inputSchema.safeParse({
        userId: SAMPLE_UUID,
        tenantId: SAMPLE_UUID,
        name: 'x'.repeat(81),
      }).success,
    ).toBe(false);
  });
});
