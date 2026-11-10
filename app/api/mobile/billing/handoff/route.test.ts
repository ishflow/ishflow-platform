import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { verifyHandoffToken } from '@/platform/billing/mobile-handoff';
import { withBypass } from '@/platform/db/tenant-context';
import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/current-context')>();
  return {
    ...actual,
    resolveContext: mockResolveContext,
  };
});

import { POST } from './route';

const TEST_EMAIL_DOMAIN = '@test-billing.ishflow';
const TEST_SLUG_PREFIX = 't-billing-h-';

const ORIGINAL_JWT_SECRET = process.env.MOBILE_JWT_SECRET;

function makeClerkUserId(): string {
  return `user_${randomUUID().replace(/-/g, '')}`;
}

function makeOrgId(): string {
  return `org_${randomUUID().replace(/-/g, '')}`;
}

async function seedUser(): Promise<{ id: string; clerkId: string }> {
  const clerkId = makeClerkUserId();
  return prisma.user.create({
    data: {
      clerkId,
      email: `${clerkId}${TEST_EMAIL_DOMAIN}`,
      firstName: 'Billing',
      lastName: 'Handoff',
    },
    select: { id: true, clerkId: true },
  });
}

async function seedTenant(): Promise<{ id: string }> {
  return withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: makeOrgId(),
        name: 'Handoff Fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
      },
      select: { id: true },
    }),
  );
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mobile/billing/handoff', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(() => {
  if (!process.env.MOBILE_JWT_SECRET) {
    process.env.MOBILE_JWT_SECRET = 'test-billing-handoff-secret-please-rotate';
  }
});

afterAll(() => {
  if (ORIGINAL_JWT_SECRET === undefined) {
    delete process.env.MOBILE_JWT_SECRET;
  } else {
    process.env.MOBILE_JWT_SECRET = ORIGINAL_JWT_SECRET;
  }
});

beforeEach(() => {
  mockResolveContext.mockReset();
});

afterEach(async () => {
  await withBypass((tx) =>
    tx.membership.deleteMany({ where: { user: { email: { contains: TEST_EMAIL_DOMAIN } } } }),
  );
  await prisma.user.deleteMany({ where: { email: { contains: TEST_EMAIL_DOMAIN } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } });
});

describe('POST /api/mobile/billing/handoff', () => {
  it('returns 401 when no auth context', async () => {
    mockResolveContext.mockResolvedValue(null);

    const res = await POST(makeRequest({ target: 'checkout' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when ctx has no tenant', async () => {
    const user = await seedUser();
    mockResolveContext.mockResolvedValue({
      user: { id: user.id, clerkId: user.clerkId },
      tenant: null,
      membership: null,
      permissions: new Set<string>(),
      scopesByEntity: new Map(),
    });

    const res = await POST(makeRequest({ target: 'checkout' }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('no_tenant');
  });

  it('returns 403 when caller is not owner', async () => {
    const user = await seedUser();
    const tenant = await seedTenant();
    mockResolveContext.mockResolvedValue({
      user: { id: user.id, clerkId: user.clerkId },
      tenant: { id: tenant.id },
      membership: { id: randomUUID(), roles: [{ name: 'bookkeeper' }] },
      permissions: new Set<string>(),
      scopesByEntity: new Map(),
    });

    const res = await POST(makeRequest({ target: 'checkout', plan: 'pro', interval: 'month' }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 on malformed body', async () => {
    const user = await seedUser();
    const tenant = await seedTenant();
    mockResolveContext.mockResolvedValue({
      user: { id: user.id, clerkId: user.clerkId },
      tenant: { id: tenant.id },
      membership: { id: randomUUID(), roles: [{ name: 'owner' }] },
      permissions: new Set<string>(),
      scopesByEntity: new Map(),
    });

    const res = await POST(makeRequest({ target: 'not-a-real-target' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad_request');
  });

  it('returns 200 with a signed handoff URL on owner happy path', async () => {
    const user = await seedUser();
    const tenant = await seedTenant();
    mockResolveContext.mockResolvedValue({
      user: { id: user.id, clerkId: user.clerkId },
      tenant: { id: tenant.id },
      membership: { id: randomUUID(), roles: [{ name: 'owner' }] },
      permissions: new Set<string>(),
      scopesByEntity: new Map(),
    });

    const res = await POST(makeRequest({ target: 'checkout', plan: 'pro', interval: 'month' }));

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(typeof body.url).toBe('string');
    expect(body.url).toContain('/billing/handoff');
    const url = new URL(body.url);
    const token = url.searchParams.get('handoff');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(() => new Date(body.expiresAt).toISOString()).not.toThrow();

    const payload = await verifyHandoffToken(token as string);
    expect(payload.userId).toBe(user.id);
    expect(payload.tenantId).toBe(tenant.id);
    expect(payload.target).toBe('checkout');
    expect(payload.plan).toBe('pro');
    expect(payload.interval).toBe('month');
  });
});
