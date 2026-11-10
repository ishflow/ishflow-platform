/**
 * Surface tests over the hand-written system super-admin tools. Locks in
 * the 8-tool contract (names, descriptions, platform_admin scope) and the
 * per-tool input-schema guards (UUID validation on apiKeyId, optional
 * limit caps, ISO datetime parsing). Critically: asserts the
 * `SETTABLE_PLATFORM_KEYS` allowlist on `system_platform_setting_set`
 * actually short-circuits non-allowlisted keys with `forbidden` BEFORE
 * any engine call.
 *
 * Engine behaviour itself lives under `platform/super-admin/system/**`
 * tests — we do not duplicate mutation assertions here.
 */
import { describe, expect, it } from 'vitest';
import { ToolError } from '../error-map';
import type { McpToolContext } from '../types';
import { SETTABLE_PLATFORM_KEYS, systemTools } from './system-tools';

const EXPECTED_NAMES = [
  'system_api_key_revoke',
  'system_cron_runs',
  'system_db_stats',
  'system_deploy_info',
  'system_env_status',
  'system_maintenance_mode',
  'system_platform_setting_get',
  'system_platform_setting_set',
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

describe('system super-admin tools', () => {
  it('exports exactly 8 tools with the expected names', () => {
    expect(systemTools).toHaveLength(8);
    expect(systemTools.map((t) => t.name).sort()).toEqual(EXPECTED_NAMES);
  });

  it('every tool requires platform_admin scope', () => {
    for (const t of systemTools) {
      expect(t.requiredScope).toBe('platform_admin');
    }
  });

  it('every tool has a meaningfully populated description', () => {
    for (const t of systemTools) {
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  /* -------------------------------------------------------------------- */
  /* Read schemas                                                         */
  /* -------------------------------------------------------------------- */

  it('system_env_status accepts the empty input', () => {
    const t = systemTools.find((x) => x.name === 'system_env_status');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
  });

  it('system_db_stats accepts empty input and a bounded slowQueryLimit', () => {
    const t = systemTools.find((x) => x.name === 'system_db_stats');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
    expect(t?.inputSchema.safeParse({ slowQueryLimit: 25 }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ slowQueryLimit: 0 }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ slowQueryLimit: 51 }).success).toBe(false);
  });

  it('system_deploy_info accepts the empty input', () => {
    const t = systemTools.find((x) => x.name === 'system_deploy_info');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
  });

  it('system_cron_runs accepts empty input and caps limit at 200', () => {
    const t = systemTools.find((x) => x.name === 'system_cron_runs');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
    expect(t?.inputSchema.safeParse({ limit: 1 }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ limit: 200 }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ limit: 201 }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('system_platform_setting_get accepts empty input and a non-empty key', () => {
    const t = systemTools.find((x) => x.name === 'system_platform_setting_get');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
    expect(t?.inputSchema.safeParse({ key: 'maintenance.enabled' }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ key: '' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ key: 'x'.repeat(121) }).success).toBe(false);
  });

  /* -------------------------------------------------------------------- */
  /* Write schemas + allowlist                                            */
  /* -------------------------------------------------------------------- */

  it('SETTABLE_PLATFORM_KEYS contains exactly the Phase 1 maintenance + readonly keys', () => {
    expect([...SETTABLE_PLATFORM_KEYS].sort()).toEqual([
      'maintenance.enabled',
      'maintenance.message',
      'maintenance.until',
      'readonly.enabled',
    ]);
  });

  it('SETTABLE_PLATFORM_KEYS does NOT contain any auth / billing / schema keys', () => {
    const forbidden = [
      'CLERK_SECRET_KEY',
      'STRIPE_SECRET_KEY',
      'DATABASE_URL',
      'role.system',
      'plan.matrix',
      'schema.version',
    ];
    for (const k of forbidden) {
      expect(SETTABLE_PLATFORM_KEYS.has(k)).toBe(false);
    }
  });

  it('system_platform_setting_set schema accepts any non-empty key (allowlist enforced at handler)', () => {
    const t = systemTools.find((x) => x.name === 'system_platform_setting_set');
    expect(t?.inputSchema.safeParse({ key: 'maintenance.enabled', value: true }).success).toBe(
      true,
    );
    expect(t?.inputSchema.safeParse({ key: '', value: true }).success).toBe(false);
  });

  it('system_platform_setting_set handler rejects non-allowlisted keys with forbidden', async () => {
    const t = systemTools.find((x) => x.name === 'system_platform_setting_set');
    expect(t).toBeDefined();
    // Non-allowlisted key must throw `forbidden` BEFORE engine is touched —
    // a thrown error here means the allowlist guard fired. If this test
    // ever fails with a DB error instead, the guard regressed.
    await expect(
      t?.handler({ key: 'CLERK_SECRET_KEY', value: 'lol' }, makeCtx()),
    ).rejects.toBeInstanceOf(ToolError);
    await expect(
      t?.handler({ key: 'role.system', value: { admin: true } }, makeCtx()),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('system_maintenance_mode accepts enabled flag + optional until/message', () => {
    const t = systemTools.find((x) => x.name === 'system_maintenance_mode');
    expect(t?.inputSchema.safeParse({ enabled: true }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ enabled: false }).success).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        enabled: true,
        until: '2027-01-01T00:00:00Z',
        message: 'Back at 09:00 UTC',
      }).success,
    ).toBe(true);
    // Explicit null is allowed for until/message (clears the field).
    expect(t?.inputSchema.safeParse({ enabled: false, until: null, message: null }).success).toBe(
      true,
    );
  });

  it('system_maintenance_mode rejects non-ISO until and over-long message', () => {
    const t = systemTools.find((x) => x.name === 'system_maintenance_mode');
    expect(t?.inputSchema.safeParse({ enabled: true, until: 'tomorrow' }).success).toBe(false);
    expect(
      t?.inputSchema.safeParse({ enabled: true, message: 'x'.repeat(501) }).success,
    ).toBe(false);
  });

  it('system_api_key_revoke requires a UUID apiKeyId', () => {
    const t = systemTools.find((x) => x.name === 'system_api_key_revoke');
    expect(t?.inputSchema.safeParse({ apiKeyId: SAMPLE_UUID }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ apiKeyId: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({}).success).toBe(false);
  });
});
