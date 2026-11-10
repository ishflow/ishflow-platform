import { describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const mockResolveFromClerkClaims = vi.hoisted(() => vi.fn());
const mockClerkClient = vi.hoisted(() => vi.fn());
const mockWithBypass = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', () => ({
  resolveContext: mockResolveContext,
  resolveFromClerkClaims: mockResolveFromClerkClaims,
  toMeResponse: (ctx: any) => ({
    user: {
      id: ctx.user.id,
      email: ctx.user.email,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      imageUrl: ctx.user.imageUrl,
    },
    tenant: ctx.tenant
      ? {
          id: ctx.tenant.id,
          slug: ctx.tenant.slug,
          name: ctx.tenant.name,
          currency: ctx.tenant.currency ?? 'USD',
          mobileFeatures: {},
        }
      : null,
    permissions: [...(ctx.permissions || [])],
  }),
}));

vi.mock('@platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: mockClerkClient,
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

const TARGET_TENANT_ID = '550e8400-e29b-41d4-a716-446655440002';
const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440003';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';

describe('POST /api/mobile/tenant/switch', () => {
  it('401 without auth', async () => {
    mockResolveContext.mockResolvedValue(null);
    const req = new NextRequest('http://x/api/mobile/tenant/switch', {
      method: 'POST',
      body: JSON.stringify({ tenantId: TARGET_TENANT_ID }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('403 when user has no DB membership in target tenant', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: USER_ID, clerkId: 'user_123', email: 'a@b.com' },
      tenant: { id: OTHER_TENANT_ID, slug: 's', name: 'n', currency: 'USD' },
    } as any);
    // No membership for the requested tenantId
    mockWithBypass.mockImplementation(async (fn: any) => {
      return fn({
        membership: { findUnique: vi.fn().mockResolvedValue(null) },
      });
    });
    const req = new NextRequest('http://x/api/mobile/tenant/switch', {
      method: 'POST',
      body: JSON.stringify({ tenantId: TARGET_TENANT_ID }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('200 + updated MeResponse on valid switch', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: USER_ID, clerkId: 'user_123', email: 'a@b.com' },
      tenant: { id: OTHER_TENANT_ID, slug: 's', name: 'n', currency: 'USD' },
      permissions: new Set(),
      scopesByEntity: new Map(),
    } as any);

    mockWithBypass.mockImplementation(async (fn: any) => {
      return fn({
        membership: {
          findUnique: vi.fn().mockResolvedValue({
            tenant: { id: TARGET_TENANT_ID, clerkOrgId: 'org_target', deletedAt: null },
          }),
        },
      });
    });

    mockResolveFromClerkClaims.mockResolvedValue({
      user: {
        id: USER_ID,
        clerkId: 'user_123',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        imageUrl: null,
      },
      tenant: { id: TARGET_TENANT_ID, slug: 's', name: 'n', currency: 'USD' },
      permissions: new Set(),
      scopesByEntity: new Map(),
    } as any);

    const mockUpdateUser = vi.fn();
    mockClerkClient.mockReturnValue({
      users: {
        updateUserMetadata: mockUpdateUser,
      },
    } as any);

    const req = new NextRequest('http://x/api/mobile/tenant/switch', {
      method: 'POST',
      body: JSON.stringify({ tenantId: TARGET_TENANT_ID }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdateUser).toHaveBeenCalledWith('user_123', {
      publicMetadata: { activeTenantId: TARGET_TENANT_ID },
    });
    expect(mockResolveFromClerkClaims).toHaveBeenCalledWith({
      userId: 'user_123',
      orgId: 'org_target',
    });

    const body = await res.json();
    expect(body.user.id).toBe(USER_ID);
    expect(body.tenant.id).toBe(TARGET_TENANT_ID);
  });
});
