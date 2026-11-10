import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const mockDeleteUserAccount = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/current-context')>();
  return {
    ...actual,
    resolveContext: mockResolveContext,
  };
});

vi.mock('@/platform/auth/delete-account', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/delete-account')>();
  return {
    ...actual,
    deleteUserAccount: mockDeleteUserAccount,
  };
});

import { DeleteAccountError } from '@/platform/auth/delete-account';
import { DELETE } from './route';

function makeCtx() {
  return {
    user: { id: randomUUID(), clerkId: `user_${randomUUID().replace(/-/g, '')}` },
    tenant: null,
    membership: null,
    permissions: new Set<string>(),
    scopesByEntity: new Map(),
  };
}

beforeEach(() => {
  mockResolveContext.mockReset();
  mockDeleteUserAccount.mockReset();
});

describe('DELETE /api/mobile/me/account', () => {
  it('returns 401 when no auth context', async () => {
    mockResolveContext.mockResolvedValue(null);

    const res = await DELETE();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
    expect(mockDeleteUserAccount).not.toHaveBeenCalled();
  });

  it('returns 200 with ISO deletedAt on happy path', async () => {
    const ctx = makeCtx();
    mockResolveContext.mockResolvedValue(ctx);
    const deletedAt = new Date('2026-05-12T03:00:00.000Z');
    mockDeleteUserAccount.mockResolvedValue({ deletedAt });

    const res = await DELETE();

    expect(res.status).toBe(200);
    expect(mockDeleteUserAccount).toHaveBeenCalledWith({ userId: ctx.user.id });
    const body = await res.json();
    expect(body.deletedAt).toBe(deletedAt.toISOString());
    // Confirm response shape matches the public contract.
    expect(() => new Date(body.deletedAt).toISOString()).not.toThrow();
  });

  it('returns 409 with tenantIds when sole-owner blocks the delete', async () => {
    const ctx = makeCtx();
    const tenantId = randomUUID();
    mockResolveContext.mockResolvedValue(ctx);
    mockDeleteUserAccount.mockRejectedValue(DeleteAccountError.soleOwnerOfTenants([tenantId]));

    const res = await DELETE();

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('sole_owner_of_tenant');
    expect(body.tenantIds).toEqual([tenantId]);
  });

  it('returns 404 when the underlying user row is missing', async () => {
    const ctx = makeCtx();
    mockResolveContext.mockResolvedValue(ctx);
    mockDeleteUserAccount.mockRejectedValue(DeleteAccountError.userNotFound(ctx.user.id));

    const res = await DELETE();

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('user_not_found');
  });

  it('rethrows unknown errors so Next.js can serve a 500', async () => {
    const ctx = makeCtx();
    mockResolveContext.mockResolvedValue(ctx);
    mockDeleteUserAccount.mockRejectedValue(new Error('boom'));

    await expect(DELETE()).rejects.toThrow('boom');
  });
});
