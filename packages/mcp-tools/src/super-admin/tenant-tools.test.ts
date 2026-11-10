/**
 * Surface tests over the hand-written tenant super-admin tools. Locks in
 * the 12-tool contract (names, descriptions, platform_admin scope) and
 * the per-tool input-schema guards (UUID validation, required reason
 * length, confirm:"YES" literal for destructive ops). Engine behaviour
 * itself lives under `platform/super-admin/**` tests — we do not
 * duplicate mutation assertions here.
 */
import { describe, expect, it } from 'vitest';
import { tenantTools } from './tenant-tools';

const EXPECTED_NAMES = [
  'tenant_add_note',
  'tenant_archive',
  'tenant_change_subscription',
  'tenant_get',
  'tenant_hard_delete',
  'tenant_lift_suspension',
  'tenant_list',
  'tenant_set_override',
  'tenant_set_tag',
  'tenant_suspend',
  'tenant_transfer_ownership',
  'tenant_wipe_data',
];

const SAMPLE_UUID = '00000000-0000-0000-0000-000000000000';

describe('tenant super-admin tools', () => {
  it('exports exactly 12 tools with the expected names', () => {
    expect(tenantTools).toHaveLength(12);
    expect(tenantTools.map((t) => t.name).sort()).toEqual(EXPECTED_NAMES);
  });

  it('every tool requires platform_admin scope', () => {
    for (const t of tenantTools) {
      expect(t.requiredScope).toBe('platform_admin');
    }
  });

  it('every tool has a meaningfully populated description', () => {
    for (const t of tenantTools) {
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('tenant_list accepts the empty input (all filters optional)', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_list');
    expect(t).toBeDefined();
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
  });

  it('tenant_list accepts known plan + status enums', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_list');
    expect(
      t?.inputSchema.safeParse({
        plan: 'pro',
        status: 'active',
        limit: 25,
      }).success,
    ).toBe(true);
  });

  it('tenant_list rejects unknown plan / status / over-limit', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_list');
    expect(t?.inputSchema.safeParse({ plan: 'enterprise_plus' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ status: 'deleted' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ limit: 9999 }).success).toBe(false);
  });

  it('tenant_get requires a UUID tenantId', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_get');
    expect(t?.inputSchema.safeParse({ tenantId: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID }).success).toBe(true);
  });

  it('tenant_suspend requires reason min 3 chars', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_suspend');
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, reason: 'xx' }).success).toBe(false);
    expect(
      t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, reason: 'real reason here' }).success,
    ).toBe(true);
  });

  it('tenant_lift_suspension accepts just a UUID', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_lift_suspension');
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID }).success).toBe(true);
    expect(t?.inputSchema.safeParse({ tenantId: 'not-uuid' }).success).toBe(false);
  });

  it('tenant_archive treats reason as optional', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_archive');
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID }).success).toBe(true);
    expect(
      t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, reason: 'no longer paying' }).success,
    ).toBe(true);
    // Too-short reason still rejected if provided.
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, reason: 'no' }).success).toBe(false);
  });

  it('tenant_transfer_ownership requires UUIDs for both tenant + new owner', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_transfer_ownership');
    expect(
      t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, newOwnerUserId: 'nope' }).success,
    ).toBe(false);
    expect(
      t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, newOwnerUserId: SAMPLE_UUID }).success,
    ).toBe(true);
  });

  it('tenant_wipe_data requires confirm:"YES" AND confirmSlug', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_wipe_data');
    // Missing confirm entirely.
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID }).success).toBe(false);
    // Wrong confirm literal.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        confirm: 'maybe',
        confirmSlug: 'acme',
      }).success,
    ).toBe(false);
    // Missing confirmSlug.
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, confirm: 'YES' }).success).toBe(false);
    // Happy path.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        confirm: 'YES',
        confirmSlug: 'acme',
      }).success,
    ).toBe(true);
  });

  it('tenant_hard_delete requires confirm:"YES" + confirmSlug; bypassWindow is optional bool', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_hard_delete');
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        confirm: 'YES',
        confirmSlug: 'acme',
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        confirm: 'YES',
        confirmSlug: 'acme',
        bypassWindow: true,
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        confirm: 'nope',
        confirmSlug: 'acme',
      }).success,
    ).toBe(false);
  });

  it('tenant_add_note rejects empty body, accepts non-empty', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_add_note');
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, body: '' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, body: 'hello' }).success).toBe(true);
  });

  it('tenant_set_tag validates color as #RRGGBB hex when provided', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_set_tag');
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, tag: 'vip' }).success).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        tag: 'vip',
        color: '#6b7280',
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        tag: 'vip',
        color: 'red',
      }).success,
    ).toBe(false);
  });

  it('tenant_set_override accepts price/value pair and optional reason/effectiveUntil', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_set_override');
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        key: 'price',
        value: 49,
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        key: 'price',
        value: 49,
        reason: 'annual prepay',
        effectiveUntil: '2027-01-01T00:00:00Z',
      }).success,
    ).toBe(true);
    // Unknown key rejected.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        key: 'feature_kill',
        value: 0,
      }).success,
    ).toBe(false);
    // Negative price rejected.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        key: 'price',
        value: -1,
      }).success,
    ).toBe(false);
  });

  it('tenant_set_override rejects non-ISO effectiveUntil', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_set_override');
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        key: 'price',
        value: 99,
        effectiveUntil: 'tomorrow',
      }).success,
    ).toBe(false);
    // Sanity-check the inverse: a real ISO-8601 timestamp still passes.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        key: 'price',
        value: 99,
        effectiveUntil: '2027-01-01T00:00:00Z',
      }).success,
    ).toBe(true);
  });

  it('tenant_change_subscription requires plan + reason; status optional', () => {
    const t = tenantTools.find((x) => x.name === 'tenant_change_subscription');
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        plan: 'pro',
        reason: 'manual bank transfer',
      }).success,
    ).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        plan: 'pro',
        status: 'active',
        reason: 'manual bank transfer',
      }).success,
    ).toBe(true);
    // Unknown plan.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        plan: 'mega',
        reason: 'manual bank transfer',
      }).success,
    ).toBe(false);
    // Missing reason.
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, plan: 'pro' }).success).toBe(false);
  });
});
