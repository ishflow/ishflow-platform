import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { verifyMobileJWT } from '@/platform/auth/mobile-jwt';
import { withBypass } from '@/platform/db/tenant-context';
import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const createOrganization = vi.hoisted(() => vi.fn());
const deleteOrganization = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/current-context')>();
  return {
    ...actual,
    resolveContext: mockResolveContext,
  };
});

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({
    organizations: {
      createOrganization,
      deleteOrganization,
    },
  })),
}));

import { POST } from './route';

const TEST_EMAIL_DOMAIN = '@test-route.ishflow';
const TEST_SLUG_PREFIX = 't-route-';

const ORIGINAL_JWT_SECRET = process.env.MOBILE_JWT_SECRET;

function makeOrgId(): string {
  return `org_${randomUUID().replace(/-/g, '')}`;
}

function makeClerkUserId(): string {
  return `user_${randomUUID().replace(/-/g, '')}`;
}

function makeWorkspaceName(): string {
  return `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 8)}`;
}

async function seedUser(clerkId: string): Promise<{ id: string; clerkId: string }> {
  return prisma.user.create({
    data: {
      clerkId,
      email: `${clerkId}${TEST_EMAIL_DOMAIN}`,
      firstName: 'Onboard',
      lastName: 'Route',
    },
    select: { id: true, clerkId: true },
  });
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mobile/onboarding/tenant', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(() => {
  if (!process.env.MOBILE_JWT_SECRET) {
    process.env.MOBILE_JWT_SECRET = 'test-mobile-jwt-secret-please-rotate';
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
  createOrganization.mockReset();
  deleteOrganization.mockReset();
});

afterEach(async () => {
  await withBypass((tx) =>
    tx.membership.deleteMany({ where: { user: { email: { contains: TEST_EMAIL_DOMAIN } } } }),
  );
  await prisma.user.deleteMany({ where: { email: { contains: TEST_EMAIL_DOMAIN } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } });
});

describe('POST /api/mobile/onboarding/tenant', () => {
  it('returns 401 when no auth context', async () => {
    mockResolveContext.mockResolvedValue(null);

    const res = await POST(makeRequest({ name: 'Acme', currency: 'USD', locale: 'en' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it('returns 400 on malformed body', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: randomUUID(), clerkId: makeClerkUserId() },
    });

    const res = await POST(makeRequest({ name: 'X' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad_request');
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it('returns 409 when user already onboarded', async () => {
    const clerkUserId = makeClerkUserId();
    const user = await seedUser(clerkUserId);
    createOrganization.mockResolvedValue({ id: makeOrgId() });
    mockResolveContext.mockResolvedValue({
      user: { id: user.id, clerkId: clerkUserId },
    });

    // Seed an existing membership so the second call hits already_onboarded.
    const { createTenantForUser } = await import('@/platform/onboarding/create-tenant');
    await createTenantForUser({
      userId: user.id,
      name: makeWorkspaceName(),
      currency: 'USD',
      locale: 'en',
    });

    createOrganization.mockReset();
    createOrganization.mockResolvedValue({ id: makeOrgId() });

    const res = await POST(
      makeRequest({ name: makeWorkspaceName(), currency: 'USD', locale: 'en' }),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('already_onboarded');
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it('returns 200 with a valid mobile JWT on happy path', async () => {
    const clerkUserId = makeClerkUserId();
    const user = await seedUser(clerkUserId);
    const orgId = makeOrgId();
    createOrganization.mockResolvedValue({ id: orgId });
    mockResolveContext.mockResolvedValue({
      user: { id: user.id, clerkId: clerkUserId },
    });

    const name = makeWorkspaceName();
    const res = await POST(makeRequest({ name, currency: 'EUR', locale: 'tr' }));

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.tenantId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(typeof body.jwt).toBe('string');
    expect(body.jwt.length).toBeGreaterThan(0);
    expect(() => new Date(body.trialEndsAt).toISOString()).not.toThrow();

    const claims = await verifyMobileJWT(body.jwt);
    // `sub` MUST be the Clerk id — the key resolveBearerContext looks the user
    // up by (clerkId). Signing the platform UUID (user.id) silently 401s every
    // later bearer-mode mobile call, so guard against that regression directly.
    expect(claims.userId).toBe(user.clerkId);
    expect(claims.userId).not.toBe(user.id);
    expect(claims.tenantId).toBe(body.tenantId);
    expect(claims.scopes).toEqual([]);

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: body.tenantId } });
    expect(tenant.clerkOrgId).toBe(orgId);
    expect(tenant.currency).toBe('EUR');
    expect(tenant.defaultLocale).toBe('tr');
  });
});
