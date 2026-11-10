/**
 * Surface tests over the hand-written demo super-admin tools. Locks in
 * the 1-tool contract (name, description, platform_admin scope) and the
 * input-schema guards (slug regex, plan/scope enums, email validation).
 *
 * The single tool (`demo_seed_tenant`) is deferred to Phase 2; the handler
 * is asserted to throw `precondition_failed` so a future un-defer doesn't
 * slip through without updating tests.
 */
import { describe, expect, it } from 'vitest';
import { ToolError } from '../error-map';
import type { McpToolContext } from '../types';
import { demoTools } from './demo-tools';

const EXPECTED_NAMES = ['demo_seed_tenant'];

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

describe('demo super-admin tools', () => {
  it('exports exactly 1 tool with the expected name', () => {
    expect(demoTools).toHaveLength(1);
    expect(demoTools.map((t) => t.name).sort()).toEqual(EXPECTED_NAMES);
  });

  it('the tool requires platform_admin scope', () => {
    for (const t of demoTools) {
      expect(t.requiredScope).toBe('platform_admin');
    }
  });

  it('the tool has a meaningfully populated description', () => {
    for (const t of demoTools) {
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('demo_seed_tenant accepts slug + name + ownerEmail with optional scope/plan', () => {
    const t = demoTools.find((x) => x.name === 'demo_seed_tenant');
    // Happy path (no optionals).
    expect(
      t?.inputSchema.safeParse({
        slug: 'demo-acme',
        name: 'Demo Acme Corp',
        ownerEmail: 'owner@acme.test',
      }).success,
    ).toBe(true);
    // With optionals.
    expect(
      t?.inputSchema.safeParse({
        slug: 'demo-globex',
        name: 'Demo Globex',
        ownerEmail: 'owner@globex.test',
        scope: 'full',
        plan: 'pro',
      }).success,
    ).toBe(true);
  });

  it('demo_seed_tenant rejects invalid slug (uppercase / underscores / too short)', () => {
    const t = demoTools.find((x) => x.name === 'demo_seed_tenant');
    const base = { name: 'X', ownerEmail: 'x@x.com' };
    expect(t?.inputSchema.safeParse({ ...base, slug: 'Demo-Acme' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ ...base, slug: 'demo_acme' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ ...base, slug: 'd' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ ...base, slug: 'x'.repeat(65) }).success).toBe(false);
  });

  it('demo_seed_tenant rejects invalid email', () => {
    const t = demoTools.find((x) => x.name === 'demo_seed_tenant');
    expect(
      t?.inputSchema.safeParse({
        slug: 'demo-acme',
        name: 'X',
        ownerEmail: 'not-an-email',
      }).success,
    ).toBe(false);
  });

  it('demo_seed_tenant rejects invalid scope / plan enums', () => {
    const t = demoTools.find((x) => x.name === 'demo_seed_tenant');
    const base = { slug: 'demo-acme', name: 'X', ownerEmail: 'x@x.com' };
    expect(t?.inputSchema.safeParse({ ...base, scope: 'wild' }).success).toBe(false);
    expect(t?.inputSchema.safeParse({ ...base, plan: 'mythril' }).success).toBe(false);
  });

  it('demo_seed_tenant validates input but throws precondition_failed at handler', async () => {
    const t = demoTools.find((x) => x.name === 'demo_seed_tenant');
    const input = {
      slug: 'demo-acme',
      name: 'Demo Acme',
      ownerEmail: 'owner@acme.test',
    };
    await expect(t?.handler(input, makeCtx())).rejects.toBeInstanceOf(ToolError);
    await expect(t?.handler(input, makeCtx())).rejects.toMatchObject({
      code: 'precondition_failed',
    });
  });
});
