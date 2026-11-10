import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const mockResolveContext = vi.hoisted(() => vi.fn());
vi.mock('./current-context', () => ({
  resolveContext: mockResolveContext,
}));

const mockIsPlatformAdmin = vi.hoisted(() => vi.fn());
vi.mock('./platform-admin', () => ({
  isPlatformAdmin: mockIsPlatformAdmin,
}));

const { notFound } = await import('next/navigation');
const { assertSuperAdmin } = await import('./assert-super-admin');

describe('assertSuperAdmin', () => {
  beforeEach(() => {
    mockResolveContext.mockReset();
    mockIsPlatformAdmin.mockReset();
    vi.mocked(notFound).mockClear();
  });

  it('calls notFound when there is no context', async () => {
    mockResolveContext.mockResolvedValue(null);

    await expect(assertSuperAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
    expect(mockIsPlatformAdmin).not.toHaveBeenCalled();
  });

  it('calls notFound when the viewer is not a platform admin', async () => {
    const ctx = {
      user: { id: 'u1', clerkId: 'cu1' },
      tenant: null,
      membership: null,
      permissions: new Set<string>(),
      scopesByEntity: new Map(),
    };
    mockResolveContext.mockResolvedValue(ctx);
    mockIsPlatformAdmin.mockReturnValue(false);

    await expect(assertSuperAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockIsPlatformAdmin).toHaveBeenCalledWith(ctx);
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('returns the resolved context when the viewer is a platform admin', async () => {
    const ctx = {
      user: { id: 'u1', clerkId: 'cu1' },
      tenant: null,
      membership: null,
      permissions: new Set<string>(['*:*']),
      scopesByEntity: new Map(),
    };
    mockResolveContext.mockResolvedValue(ctx);
    mockIsPlatformAdmin.mockReturnValue(true);

    const result = await assertSuperAdmin();
    expect(result).toBe(ctx);
    expect(notFound).not.toHaveBeenCalled();
  });
});
