import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAssertSuperAdmin = vi.hoisted(() => vi.fn());
const mockWithBypass = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/assert-super-admin', () => ({
  assertSuperAdmin: mockAssertSuperAdmin,
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

// Set a stable secret so signCookie works without env wiring.
process.env.SUPER_ADMIN_IMPERSONATION_SECRET =
  process.env.SUPER_ADMIN_IMPERSONATION_SECRET ?? 'test-secret-test-secret-test-secret-1234';

const { POST: startPOST } = await import('./start/route');
const { POST: endPOST } = await import('./end/route');
const { SUPER_IMPERSONATE_COOKIE, verifyCookie } = await import(
  '@/platform/auth/super-impersonate'
);

const SUPER_CTX = {
  user: { id: 'u-super', clerkId: 'cu_super' },
  tenant: null,
  membership: null,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map(),
};

const TENANT_FIXTURE = { id: 't-acme', name: 'Acme', slug: 'acme', currency: 'USD' };

function makeReq(url: string): Request {
  return new Request(url, { method: 'POST' });
}

function makeHeaders(map: Record<string, string>): { get: (k: string) => string | null } {
  return {
    get: (k: string) => map[k.toLowerCase()] ?? null,
  };
}

describe('POST /super-admin/tenants/[tenantId]/impersonate/start', () => {
  beforeEach(() => {
    mockAssertSuperAdmin.mockReset();
    mockWithBypass.mockReset();
    mockHeaders.mockReset();
  });

  it('404 when tenant does not exist', async () => {
    mockAssertSuperAdmin.mockResolvedValue(SUPER_CTX);
    mockHeaders.mockResolvedValue(makeHeaders({}));
    // First call (tenant.findUnique) → null. No second call expected.
    mockWithBypass.mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
      fn({ tenant: { findUnique: vi.fn().mockResolvedValue(null) } }),
    );

    const res = await startPOST(
      makeReq('http://localhost/super-admin/tenants/t-missing/impersonate/start'),
      { params: Promise.resolve({ tenantId: 't-missing' }) },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'tenant_not_found' });
    // No audit log written.
    expect(mockWithBypass).toHaveBeenCalledTimes(1);
  });

  it('redirects 303 + sets cookie + writes audit row', async () => {
    mockAssertSuperAdmin.mockResolvedValue(SUPER_CTX);
    mockHeaders.mockResolvedValue(
      makeHeaders({ 'x-forwarded-for': '10.0.0.1', 'user-agent': 'vitest/1.0' }),
    );

    const auditCreate = vi.fn().mockResolvedValue({ id: 'audit-1' });
    mockWithBypass
      .mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
        fn({ tenant: { findUnique: vi.fn().mockResolvedValue(TENANT_FIXTURE) } }),
      )
      .mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
        fn({ platformAuditLog: { create: auditCreate } }),
      );

    const res = await startPOST(
      makeReq('http://localhost/super-admin/tenants/t-acme/impersonate/start'),
      { params: Promise.resolve({ tenantId: 't-acme' }) },
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SUPER_IMPERSONATE_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');

    // Extract cookie value and verify payload.
    const m = setCookie.match(new RegExp(`${SUPER_IMPERSONATE_COOKIE}=([^;]+)`));
    expect(m).not.toBeNull();
    const payload = await verifyCookie(decodeURIComponent(m?.[1] ?? ''));
    expect(payload).not.toBeNull();
    expect(payload?.actorClerkId).toBe('cu_super');
    expect(payload?.tenantId).toBe('t-acme');

    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        actorClerkId: 'cu_super',
        action: 'impersonate.start',
        tenantId: 't-acme',
        ip: '10.0.0.1',
        userAgent: 'vitest/1.0',
      },
    });
  });

  it('persists null IP/UA when headers missing', async () => {
    mockAssertSuperAdmin.mockResolvedValue(SUPER_CTX);
    mockHeaders.mockResolvedValue(makeHeaders({}));

    const auditCreate = vi.fn().mockResolvedValue({ id: 'audit-1' });
    mockWithBypass
      .mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
        fn({ tenant: { findUnique: vi.fn().mockResolvedValue(TENANT_FIXTURE) } }),
      )
      .mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
        fn({ platformAuditLog: { create: auditCreate } }),
      );

    const res = await startPOST(
      makeReq('http://localhost/super-admin/tenants/t-acme/impersonate/start'),
      { params: Promise.resolve({ tenantId: 't-acme' }) },
    );

    expect(res.status).toBe(303);
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        actorClerkId: 'cu_super',
        action: 'impersonate.start',
        tenantId: 't-acme',
        ip: null,
        userAgent: null,
      },
    });
  });
});

describe('POST /super-admin/tenants/[tenantId]/impersonate/end', () => {
  beforeEach(() => {
    mockAssertSuperAdmin.mockReset();
    mockWithBypass.mockReset();
    mockHeaders.mockReset();
  });

  it('redirects 303 to tenant page, deletes cookie, writes audit row', async () => {
    mockAssertSuperAdmin.mockResolvedValue(SUPER_CTX);
    mockHeaders.mockResolvedValue(
      makeHeaders({ 'x-forwarded-for': '10.0.0.2', 'user-agent': 'vitest/2.0' }),
    );

    const auditCreate = vi.fn().mockResolvedValue({ id: 'audit-2' });
    mockWithBypass.mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
      fn({ platformAuditLog: { create: auditCreate } }),
    );

    const res = await endPOST(
      makeReq('http://localhost/super-admin/tenants/t-acme/impersonate/end'),
      { params: Promise.resolve({ tenantId: 't-acme' }) },
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost/super-admin/tenants/t-acme');

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SUPER_IMPERSONATE_COOKIE}=`);
    // Deleted cookies have an expired/cleared value.
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=thu, 01 jan 1970/);

    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        actorClerkId: 'cu_super',
        action: 'impersonate.end',
        tenantId: 't-acme',
        ip: '10.0.0.2',
        userAgent: 'vitest/2.0',
      },
    });
  });
});
