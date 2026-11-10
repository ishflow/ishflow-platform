import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock `resolveContext` before importing the SUT so the helper picks up the
// stubbed implementation. `ApiKeyAuthError` is preserved via `vi.importActual`
// because both the SUT and the tests need the real class to assert on.
vi.mock('@/platform/auth/current-context', async () => {
  const actual = await vi.importActual<typeof import('@/platform/auth/current-context')>(
    '@/platform/auth/current-context',
  );
  return { ...actual, resolveContext: vi.fn() };
});

import type { AppContext } from '@/platform/auth/current-context';
import { resolveContext } from '@/platform/auth/current-context';
import { ApiKeyAuthError } from '@/platform/auth/resolve-api-key';
import { getApiKeyScope, requireApiKey } from './auth';

const mockedResolveContext = vi.mocked(resolveContext);

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/v1/products', { headers });
}

function buildCtx(permissions: string[]): AppContext {
  return {
    user: { id: 'u1', clerkId: 'clerk_u1' } as AppContext['user'],
    tenant: { id: 't1', slug: 'demo' } as AppContext['tenant'],
    membership: null,
    permissions: new Set(permissions),
    scopesByEntity: new Map(),
    addons: new Set(),
  };
}

beforeEach(() => {
  mockedResolveContext.mockReset();
});

describe('requireApiKey — auth failures', () => {
  it('throws 401 unauthorized when Authorization header is missing', async () => {
    const req = makeRequest();
    await expect(requireApiKey(req, 'read')).rejects.toMatchObject({
      name: 'ApiKeyAuthError',
      status: 401,
      code: 'unauthorized',
    });
    expect(mockedResolveContext).not.toHaveBeenCalled();
  });

  it('throws 401 unauthorized when Authorization header is malformed', async () => {
    const req = makeRequest({ authorization: 'NotBearer something' });
    const err = await requireApiKey(req, 'read').catch((e) => e);
    expect(err).toBeInstanceOf(ApiKeyAuthError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
  });

  it('throws 401 invalid_api_key when token is not a `1ca_live_` API key', async () => {
    const req = makeRequest({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.fakejwt' });
    const err = await requireApiKey(req, 'read').catch((e) => e);
    expect(err).toBeInstanceOf(ApiKeyAuthError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('invalid_api_key');
    expect(mockedResolveContext).not.toHaveBeenCalled();
  });

  it('throws 401 invalid_api_key when resolver returns null (no match / revoked)', async () => {
    mockedResolveContext.mockResolvedValueOnce(null);
    const req = makeRequest({
      authorization: 'Bearer 1ca_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    const err = await requireApiKey(req, 'read').catch((e) => e);
    expect(err).toBeInstanceOf(ApiKeyAuthError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('invalid_api_key');
  });
});

describe('requireApiKey — scope enforcement', () => {
  it('throws 403 insufficient_scope when a read key hits a write endpoint', async () => {
    const ctx = buildCtx(['products:read', 'sales_invoice:list']);
    mockedResolveContext.mockResolvedValueOnce(ctx);
    const req = makeRequest({
      authorization: 'Bearer 1ca_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    const err = await requireApiKey(req, 'write').catch((e) => e);
    expect(err).toBeInstanceOf(ApiKeyAuthError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('insufficient_scope');
  });

  it('returns the AppContext on the read-key + read-endpoint happy path', async () => {
    const ctx = buildCtx(['products:read', 'sales_invoice:list']);
    mockedResolveContext.mockResolvedValueOnce(ctx);
    const req = makeRequest({
      authorization: 'Bearer 1ca_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    const result = await requireApiKey(req, 'read');
    expect(result).toBe(ctx);
  });

  it('returns the AppContext on the write-key + write-endpoint happy path', async () => {
    const ctx = buildCtx(['products:read', 'products:create', 'sales_invoice:post']);
    mockedResolveContext.mockResolvedValueOnce(ctx);
    const req = makeRequest({
      authorization: 'Bearer 1ca_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    const result = await requireApiKey(req, 'write');
    expect(result).toBe(ctx);
  });
});

describe('getApiKeyScope', () => {
  it('returns "read" for a context with only read-action permissions', () => {
    const ctx = buildCtx(['products:read', 'sales_invoice:list', 'customer:view']);
    expect(getApiKeyScope(ctx)).toBe('read');
  });

  it('returns "write" when any write-action permission is present', () => {
    const ctx = buildCtx(['products:read', 'products:create']);
    expect(getApiKeyScope(ctx)).toBe('write');
  });

  it('returns "write" when only :post is granted (no CRUD verbs)', () => {
    const ctx = buildCtx(['sales_invoice:post', 'sales_invoice:read']);
    expect(getApiKeyScope(ctx)).toBe('write');
  });
});
