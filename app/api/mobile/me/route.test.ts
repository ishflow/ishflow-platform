import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const mockGetSetupProgress = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/current-context')>();
  return {
    ...actual,
    resolveContext: mockResolveContext,
  };
});

vi.mock('@/platform/onboarding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/onboarding')>();
  return {
    ...actual,
    getSetupProgress: mockGetSetupProgress,
  };
});

import { GET } from './route';

const FULL_CTX = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: 'https://example.com/avatar.png',
  },
  tenant: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    slug: 'test-org',
    name: 'Test Org',
    currency: 'USD',
    mobileFeatures: {},
  },
  membership: null,
  permissions: new Set(['*:*']),
  scopesByEntity: new Map(),
} as const;

beforeEach(() => {
  mockResolveContext.mockReset();
  mockGetSetupProgress.mockReset();
});

describe('GET /api/mobile/me', () => {
  it('returns 401 JSON when no auth provided', async () => {
    mockResolveContext.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/mobile/me'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('returns 200 JSON when valid Bearer JWT', async () => {
    mockResolveContext.mockResolvedValue(FULL_CTX);
    mockGetSetupProgress.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/mobile/me'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(body.tenant).not.toBeNull();
    expect(body.permissions).toContain('*:*');
  });

  it('includes setupProgress when onboarding is incomplete', async () => {
    mockResolveContext.mockResolvedValue(FULL_CTX);
    mockGetSetupProgress.mockResolvedValue({
      workspaceCreated: true,
      demoImported: false,
      invitesSent: false,
      firstCustomerAdded: false,
      firstProductAdded: false,
      firstInvoicePosted: false,
    });

    const res = await GET(new Request('http://localhost/api/mobile/me'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.setupProgress).toMatchObject({
      workspaceCreated: true,
      demoImported: false,
      invitesSent: false,
      firstCustomerAdded: false,
      firstProductAdded: false,
      firstInvoicePosted: false,
    });
    expect(mockGetSetupProgress).toHaveBeenCalledWith(FULL_CTX.tenant.id);
  });

  it('omits setupProgress when onboarding is fully complete', async () => {
    mockResolveContext.mockResolvedValue(FULL_CTX);
    mockGetSetupProgress.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/mobile/me'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.setupProgress).toBeUndefined();
  });

  it('skips setupProgress lookup when ctx has no tenant', async () => {
    mockResolveContext.mockResolvedValue({ ...FULL_CTX, tenant: null });

    const res = await GET(new Request('http://localhost/api/mobile/me'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenant).toBeNull();
    expect(body.setupProgress).toBeUndefined();
    expect(mockGetSetupProgress).not.toHaveBeenCalled();
  });
});
