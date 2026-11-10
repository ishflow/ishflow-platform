/**
 * Surface tests over the hand-written audit super-admin tools. Locks in
 * the 2-tool contract (names, descriptions, platform_admin scope) and the
 * per-tool input-schema guards (UUID validation, optional filters,
 * bounded limit). Engine behaviour itself lives in
 * `platform/super-admin/list-platform-audit.test.ts` — we do not duplicate
 * query assertions here.
 */
import { describe, expect, it } from 'vitest';
import { auditTools } from './audit-tools';

const EXPECTED_NAMES = ['audit_get', 'audit_search'];

const SAMPLE_UUID = '00000000-0000-0000-0000-000000000000';

describe('audit super-admin tools', () => {
  it('exports exactly 2 tools with the expected names', () => {
    expect(auditTools).toHaveLength(2);
    expect(auditTools.map((t) => t.name).sort()).toEqual(EXPECTED_NAMES);
  });

  it('every tool requires platform_admin scope', () => {
    for (const t of auditTools) {
      expect(t.requiredScope).toBe('platform_admin');
    }
  });

  it('every tool has a meaningfully populated description', () => {
    for (const t of auditTools) {
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('audit_search accepts empty input and all filter combinations', () => {
    const t = auditTools.find((x) => x.name === 'audit_search');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
    expect(t?.inputSchema.safeParse({ action: 'tenant.suspended' }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ actorClerkId: 'user_xyz' }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID }).success).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        action: 'plan.changed',
        actorClerkId: 'user_xyz',
        tenantId: SAMPLE_UUID,
        limit: 100,
        cursor: SAMPLE_UUID,
      }).success,
    ).toBe(true);
  });

  it('audit_search rejects invalid filter values', () => {
    const t = auditTools.find((x) => x.name === 'audit_search');
    expect(t?.inputSchema.safeParse({ tenantId: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ cursor: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ action: '' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ action: 'x'.repeat(121) }).success).toBe(false);
  });

  it('audit_search caps limit at 200', () => {
    const t = auditTools.find((x) => x.name === 'audit_search');
    expect(t?.inputSchema.safeParse({ limit: 1 }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ limit: 200 }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ limit: 201 }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('audit_get requires a UUID id', () => {
    const t = auditTools.find((x) => x.name === 'audit_get');
    expect(t?.inputSchema.safeParse({ id: SAMPLE_UUID }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ id: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({}).success).toBe(false);
  });
});
