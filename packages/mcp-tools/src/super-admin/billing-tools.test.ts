/**
 * Surface tests over the hand-written billing super-admin tools. Locks in
 * the 3-tool contract (names, descriptions, platform_admin scope) and the
 * per-tool input-schema guards (UUID/datetime validation, plan enum,
 * required reason length). Engine behaviour itself lives under
 * `platform/super-admin/revenue.test.ts` and
 * `platform/super-admin/manual-plan-change.test.ts` — we do not duplicate
 * mutation assertions here.
 *
 * Deferred tools (`billing_events_list`) are asserted to throw
 * `precondition_failed` at handler time so a future un-defer doesn't slip
 * through without updating tests.
 */
import { describe, expect, it } from 'vitest';
import { ToolError } from '../error-map';
import type { McpToolContext } from '../types';
import { billingTools } from './billing-tools';

const EXPECTED_NAMES = ['billing_events_list', 'billing_manual_plan_change', 'billing_revenue_snapshot'];

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

describe('billing super-admin tools', () => {
  it('exports exactly 3 tools with the expected names', () => {
    expect(billingTools).toHaveLength(3);
    expect(billingTools.map((t) => t.name).sort()).toEqual(EXPECTED_NAMES);
  });

  it('every tool requires platform_admin scope', () => {
    for (const t of billingTools) {
      expect(t.requiredScope).toBe('platform_admin');
    }
  });

  it('every tool has a meaningfully populated description', () => {
    for (const t of billingTools) {
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('billing_events_list validates input but throws precondition_failed at handler', async () => {
    const t = billingTools.find((x) => x.name === 'billing_events_list');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        type: 'customer.subscription.updated',
        since: '2026-01-01T00:00:00Z',
        limit: 100,
      }).success,
    ).toBe(true);
    expect(t?.inputSchema.safeParse({ tenantId: 'not-uuid' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ since: 'tomorrow' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ limit: 201 }).success).toBe(false);

    await expect(t?.handler({}, makeCtx())).rejects.toBeInstanceOf(ToolError);
    await expect(t?.handler({}, makeCtx())).rejects.toMatchObject({
      code: 'precondition_failed',
    });
  });

  it('billing_revenue_snapshot accepts the empty input', () => {
    const t = billingTools.find((x) => x.name === 'billing_revenue_snapshot');
    expect(t?.inputSchema.safeParse({}).success).toBe(true);
  });

  it('billing_manual_plan_change requires tenantId + plan + reason (min 3)', () => {
    const t = billingTools.find((x) => x.name === 'billing_manual_plan_change');
    // Happy path.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        plan: 'pro',
        reason: 'bank transfer received',
      }).success,
    ).toBe(true);
    // With optional status.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        plan: 'enterprise',
        status: 'active',
        reason: 'comp account',
      }).success,
    ).toBe(true);
    // Reason too short.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        plan: 'pro',
        reason: 'x',
      }).success,
    ).toBe(false);
    // Missing reason.
    expect(t?.inputSchema.safeParse({ tenantId: SAMPLE_UUID, plan: 'pro' }).success).toBe(false);
    // Bad plan.
    expect(
      t?.inputSchema.safeParse({
        tenantId: SAMPLE_UUID,
        plan: 'mythril',
        reason: 'because',
      }).success,
    ).toBe(false);
    // Bad tenantId.
    expect(
      t?.inputSchema.safeParse({
        tenantId: 'not-uuid',
        plan: 'pro',
        reason: 'because',
      }).success,
    ).toBe(false);
  });

  it('billing_manual_plan_change accepts all 5 plan enum values', () => {
    const t = billingTools.find((x) => x.name === 'billing_manual_plan_change');
    for (const plan of ['free', 'starter', 'pro', 'business', 'enterprise'] as const) {
      expect(
        t?.inputSchema.safeParse({
          tenantId: SAMPLE_UUID,
          plan,
          reason: 'audit row',
        }).success,
      ).toBe(true);
    }
  });
});
