import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPermissionAndScopeData } from './current-context';
import { signMobileJWT } from './mobile-jwt';

beforeAll(() => {
  process.env.MOBILE_JWT_SECRET = 'a'.repeat(48);
});

const bypassCalls: unknown[] = [];

// Per-test toggle: when true, the membership.findUnique mock returns null so
// we can exercise the "JWT names a tenant the user has no membership in"
// branch in resolveBearerContext. Reset to false in beforeEach.
let membershipReturnsNull = false;

// Per-test override for membership.findUnique roles — used by the A1
// "permission downgrade" test to make CURRENT membership perms differ from the
// (stale) perms baked into a mobile JWT's `scopes`.
let membershipRolesOverride: Array<{
  id: string;
  name: string;
  permissions: string[];
  scopes: [];
}> | null = null;

// Per-test toggle: controls the membership.findMany result for the
// "Clerk session lacks active org" fallback branch. Defaults to a single
// active membership (the common single-tenant case).
let membershipFindManyResult: Array<Record<string, unknown>> = [
  {
    id: 'm1',
    tenantId: 't1',
    userId: 'u1',
    roles: [{ id: 'r1', name: 'owner', permissions: ['*:*'], scopes: [] }],
    tenant: { id: 't1', clerkOrgId: 'co1', deletedAt: null },
  },
];

// Per-test toggle for the cookie/JWKS orgId-present branch's
// `tx.tenant.findFirst` lookup. Defaults to a resolvable tenant; set to null to
// simulate an active Clerk org whose tenant link isn't visible in our DB yet
// (the right-after-signup race that left the sidebar blank on first load).
let tenantFindFirstResult: Record<string, unknown> | null = {
  id: 't1',
  clerkOrgId: 'co1',
  deletedAt: null,
};

const mockAuth = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());
const mockCookies = vi.hoisted(() => vi.fn());
const mockVerifyToken = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: <T>(fn: (tx: unknown) => Promise<T>) => {
    bypassCalls.push('enter');
    return fn({
      user: { findUnique: async () => ({ id: 'u1', clerkId: 'cu1' }) },
      tenant: {
        findUnique: async () => ({ id: 't1', clerkOrgId: 'co1', deletedAt: null }),
        findFirst: async () => tenantFindFirstResult,
      },
      tenantAddon: { findMany: async () => [] },
      membership: {
        findUnique: async () =>
          membershipReturnsNull
            ? null
            : {
                id: 'm1',
                tenantId: 't1',
                userId: 'u1',
                roles: membershipRolesOverride ?? [
                  {
                    id: 'r1',
                    name: 'owner',
                    permissions: ['*:*'],
                    scopes: [],
                  },
                ],
              },
        findMany: async () => membershipFindManyResult,
        count: async () => membershipFindManyResult.length,
      },
    });
  },
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
  cookies: mockCookies,
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  clerkClient: async () => ({
    users: {
      getOrganizationMembershipList: async () => ({ data: [] }),
    },
  }),
  verifyToken: mockVerifyToken,
}));

import { resolveContext } from './current-context';

describe('resolveContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipReturnsNull = false;
    tenantFindFirstResult = { id: 't1', clerkOrgId: 'co1', deletedAt: null };
    mockAuth.mockResolvedValue({ userId: 'cu1', orgId: 'co1' });
    mockCookies.mockReturnValue({ get: () => undefined });
    mockHeaders.mockReturnValue({ get: () => null });
  });

  it('opens a bounded number of withBypass transactions when everything is cached', async () => {
    bypassCalls.length = 0;
    const ctx = await resolveContext();
    expect(ctx).not.toBeNull();
    // One for the initial user/tenant/membership lookup + one for attachAddons
    // (loadEnabledAddons). Bounded — no per-entity transaction fan-out.
    expect(bypassCalls.filter((c) => c === 'enter').length).toBeLessThanOrEqual(2);
  });

  it('populates permissions from role.permissions', async () => {
    const ctx = await resolveContext();
    expect(ctx?.permissions.has('*:*')).toBe(true);
  });

  it('registers wildcard-entity scope under the "*" key when role has wildcard perms', async () => {
    const ctx = await resolveContext();
    expect(ctx?.scopesByEntity.has('*')).toBe(true);
  });
});

describe('resolveContext Clerk JWT bearer (Android)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipReturnsNull = false;
    tenantFindFirstResult = { id: 't1', clerkOrgId: 'co1', deletedAt: null };
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    mockCookies.mockReturnValue({ get: () => undefined });
    mockVerifyToken.mockReset();
  });

  it('resolves user + tenant from a valid Clerk Bearer JWT', async () => {
    mockHeaders.mockReturnValue({
      get: (k: string) => (k === 'authorization' ? 'Bearer valid-jwt' : null),
    });
    mockVerifyToken.mockResolvedValue({
      sub: 'cu1',
      org_id: 'co1',
      org_role: 'org:admin',
    });

    const ctx = await resolveContext();
    expect(ctx?.user.id).toBe('u1');
    expect(ctx?.tenant?.id).toBe('t1');
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-jwt', {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  });

  it('returns null when Bearer token is invalid for both schemes', async () => {
    mockHeaders.mockReturnValue({ get: () => 'Bearer bad' });
    mockVerifyToken.mockRejectedValue(new Error('invalid'));
    expect(await resolveContext()).toBeNull();
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
    expect(mockVerifyToken).toHaveBeenCalledWith('bad', {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  });

  it('returns null for empty Bearer token', async () => {
    mockHeaders.mockReturnValue({ get: () => 'Bearer ' });
    expect(await resolveContext()).toBeNull();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('returns null for non-Bearer Authorization header', async () => {
    mockHeaders.mockReturnValue({ get: () => 'Basic abc123' });
    expect(await resolveContext()).toBeNull();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('returns null when there is neither cookie nor Bearer', async () => {
    mockHeaders.mockReturnValue({ get: () => null });
    expect(await resolveContext()).toBeNull();
  });
});

describe('resolveContext mobile JWT bearer (iOS) — permission downgrade (A1)', () => {
  let savedBypass: string | undefined;
  beforeEach(() => {
    vi.clearAllMocks();
    membershipReturnsNull = false;
    membershipRolesOverride = null;
    // The test env carries DEV_AUTH_BYPASS=1 (from .env.local), which would
    // short-circuit resolveContext to the dev tenant. Disable it so the real
    // bearer path runs.
    savedBypass = process.env.DEV_AUTH_BYPASS;
    process.env.DEV_AUTH_BYPASS = '0';
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    mockCookies.mockReturnValue({ get: () => undefined });
  });

  afterEach(() => {
    membershipRolesOverride = null;
    if (savedBypass === undefined) {
      // biome-ignore lint/performance/noDelete: must truly unset the env var
      delete process.env.DEV_AUTH_BYPASS;
    } else {
      process.env.DEV_AUTH_BYPASS = savedBypass;
    }
  });

  it('derives perms from CURRENT membership, not the stale scopes baked into the JWT', async () => {
    // The JWT was minted while the user was an owner (scopes: ['*:*',
    // 'sales.invoice:delete']). They have since been demoted to a read-only
    // role. The bearer context MUST reflect the current (low) membership and
    // NOT re-grant the stale baked-in scopes.
    membershipRolesOverride = [
      { id: 'r1', name: 'viewer', permissions: ['sales.invoice:read'], scopes: [] },
    ];
    const staleToken = await signMobileJWT({
      userId: 'cu1',
      tenantId: 't1',
      scopes: ['*:*', 'sales.invoice:delete', 'sales.invoice:write'],
    });
    mockHeaders.mockReturnValue({
      get: (k: string) => (k === 'authorization' ? `Bearer ${staleToken}` : null),
    });

    const ctx = await resolveContext();
    expect(ctx?.tenant?.id).toBe('t1');
    expect(ctx?.permissions.has('sales.invoice:read')).toBe(true);
    // The stale elevated scopes must NOT survive the downgrade.
    expect(ctx?.permissions.has('*:*')).toBe(false);
    expect(ctx?.permissions.has('sales.invoice:delete')).toBe(false);
    expect(ctx?.permissions.has('sales.invoice:write')).toBe(false);
  });
});

describe('resolveContext cookie session without active organization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipReturnsNull = false;
    tenantFindFirstResult = { id: 't1', clerkOrgId: 'co1', deletedAt: null };
    mockCookies.mockReturnValue({ get: () => undefined });
    mockHeaders.mockReturnValue({ get: () => null });
  });

  it('falls back to the single non-deleted membership when Clerk session has no orgId', async () => {
    // Mobile clients (iOS ASWebAuthenticationSession ephemeral browser) sign
    // in via Clerk hosted UI without ever calling setActive({ organization }),
    // so auth() returns orgId: null. Without this fallback, every fresh-mobile
    // sign-in lands on the "Kuruluş yok" empty state even though the user
    // owns exactly one tenant on the web side.
    mockAuth.mockResolvedValue({ userId: 'cu1', orgId: null });
    membershipFindManyResult = [
      {
        id: 'm1',
        tenantId: 't1',
        userId: 'u1',
        roles: [{ id: 'r1', name: 'owner', permissions: ['*:*'], scopes: [] }],
        tenant: { id: 't1', clerkOrgId: 'co1', deletedAt: null },
      },
    ];

    const ctx = await resolveContext();
    expect(ctx).not.toBeNull();
    expect(ctx?.tenant?.id).toBe('t1');
    expect(ctx?.membership?.id).toBe('m1');
    expect(ctx?.permissions.has('*:*')).toBe(true);
  });

  it('returns null tenant when user has zero active memberships', async () => {
    mockAuth.mockResolvedValue({ userId: 'cu1', orgId: null });
    membershipFindManyResult = [];

    const ctx = await resolveContext();
    expect(ctx).not.toBeNull();
    expect(ctx?.tenant).toBeNull();
    expect(ctx?.membership).toBeNull();
  });

  it('falls back to the sole membership when the active org has no DB tenant yet', async () => {
    // Right-after-signup race: the cookie session already carries an active
    // Clerk orgId, but the org→tenant link isn't visible in our DB on the FIRST
    // dashboard render (Clerk claims are eventually consistent). Without this
    // fallback resolution yields empty permissions → blank sidebar that only
    // fixes itself on manual refresh. With exactly one committed membership we
    // resolve it deterministically instead.
    mockAuth.mockResolvedValue({ userId: 'cu1', orgId: 'co1' });
    tenantFindFirstResult = null; // active org not linked to any tenant yet
    membershipFindManyResult = [
      {
        id: 'm1',
        tenantId: 't1',
        userId: 'u1',
        roles: [{ id: 'r1', name: 'owner', permissions: ['*:*'], scopes: [] }],
        tenant: { id: 't1', clerkOrgId: 'co1', deletedAt: null },
      },
    ];

    const ctx = await resolveContext();
    expect(ctx).not.toBeNull();
    expect(ctx?.tenant?.id).toBe('t1');
    expect(ctx?.membership?.id).toBe('m1');
    expect(ctx?.permissions.has('*:*')).toBe(true);
  });

  it('auto-picks oldest active membership when user belongs to multiple tenants (orgId-less session)', async () => {
    mockAuth.mockResolvedValue({ userId: 'cu1', orgId: null });
    membershipFindManyResult = [
      {
        id: 'm1',
        tenantId: 't1',
        userId: 'u1',
        roles: [{ id: 'r1', name: 'owner', permissions: ['*:*'], scopes: [] }],
        tenant: { id: 't1', clerkOrgId: 'co1', deletedAt: null },
      },
      {
        id: 'm2',
        tenantId: 't2',
        userId: 'u1',
        roles: [{ id: 'r2', name: 'owner', permissions: ['*:*'], scopes: [] }],
        tenant: { id: 't2', clerkOrgId: 'co2', deletedAt: null },
      },
    ];

    const ctx = await resolveContext();
    expect(ctx).not.toBeNull();
    expect(ctx?.tenant?.id).toBe('t1');
    expect(ctx?.membership?.id).toBe('m1');
    expect(ctx?.permissions.has('*:*')).toBe(true);
  });
});

describe('buildPermissionAndScopeData', () => {
  it('registers an empty-rules group per entity granted by a role with no scopes', () => {
    const data = buildPermissionAndScopeData([
      {
        id: 'r1',
        permissions: ['sales.invoice:read', 'sales.invoice:write'],
        scopes: [],
      },
    ]);
    expect(data.permissions.has('sales.invoice:read')).toBe(true);
    const groups = data.scopesByEntity.get('sales.invoice');
    expect(groups).toHaveLength(1);
    expect(groups?.[0]?.rules).toHaveLength(0);
  });

  it('attaches scope rules to the entity they target', () => {
    const data = buildPermissionAndScopeData([
      {
        id: 'r1',
        permissions: ['sales.invoice:read'],
        scopes: [
          {
            entityId: 'sales.invoice',
            field: 'warehouseId',
            operator: 'equals',
            value: 'moscow',
          },
        ],
      },
    ]);
    const groups = data.scopesByEntity.get('sales.invoice');
    expect(groups?.[0]?.rules).toHaveLength(1);
    expect(groups?.[0]?.rules[0]?.field).toBe('warehouseId');
  });

  it('unions permissions across multiple roles', () => {
    const data = buildPermissionAndScopeData([
      { id: 'a', permissions: ['sales.invoice:read'], scopes: [] },
      { id: 'b', permissions: ['purchases.invoice:read'], scopes: [] },
    ]);
    expect(data.permissions.has('sales.invoice:read')).toBe(true);
    expect(data.permissions.has('purchases.invoice:read')).toBe(true);
  });

  it('registers wildcard entity "*" when role has module-wildcard perm', () => {
    const data = buildPermissionAndScopeData([
      { id: 'r1', permissions: ['sales.*:*'], scopes: [] },
    ]);
    expect(data.scopesByEntity.has('*')).toBe(true);
  });
});

describe('resolveContext HS256 bearer (iOS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipReturnsNull = false;
    tenantFindFirstResult = { id: 't1', clerkOrgId: 'co1', deletedAt: null };
    mockAuth.mockResolvedValue({ userId: 'cu1', orgId: 'co1' });
    mockCookies.mockReturnValue({ get: () => undefined });
    mockHeaders.mockReturnValue({ get: () => null });
    mockVerifyToken.mockReset();
  });

  it('returns context from a valid mobile JWT header when no Clerk session', async () => {
    // JWT carries Clerk user id (subject) + internal tenant id; bearer branch
    // looks up user by clerkId and tenant by id, then assembles AppContext
    // exactly like the Clerk path.
    const token = await signMobileJWT({
      userId: 'cu1',
      tenantId: 't1',
      scopes: ['sales.read'],
    });
    const headers = new Headers({ authorization: `Bearer ${token}` });

    const ctx = await resolveContext({ headers });
    expect(ctx).not.toBeNull();
    expect(ctx?.user.id).toBe('u1');
    expect(ctx?.tenant?.id).toBe('t1');
    expect(ctx?.membership?.id).toBe('m1');
    // Membership role contributes '*:*' AND JWT scope is unioned in.
    expect(ctx?.permissions.has('*:*')).toBe(true);
    expect(ctx?.permissions.has('sales.read')).toBe(true);
    // Clerk's auth() must NOT run when HS256 bearer succeeds.
    expect(mockAuth).not.toHaveBeenCalled();
    // Clerk JWKS verifyToken must NOT run when HS256 bearer succeeds.
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('returns context with null tenant when JWT carries tenantId=null', async () => {
    const token = await signMobileJWT({
      userId: 'cu1',
      tenantId: null,
      scopes: ['mobile.read'],
    });
    const headers = new Headers({ authorization: `Bearer ${token}` });

    const ctx = await resolveContext({ headers });
    expect(ctx).not.toBeNull();
    expect(ctx?.user.id).toBe('u1');
    expect(ctx?.tenant).toBeNull();
    expect(ctx?.membership).toBeNull();
    expect(ctx?.permissions.has('mobile.read')).toBe(true);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('falls through to Clerk JWKS then cookie when HS256 JWT is invalid', async () => {
    const headers = new Headers({ authorization: 'Bearer not-a-real-jwt' });
    // HS256 will fail. JWKS will be tried (mockVerifyToken default returns
    // undefined → resolveFromClerkClaims will look up by sub=undefined → fails
    // gracefully). Eventually falls through to cookie session.
    mockVerifyToken.mockRejectedValue(new Error('invalid jwks'));

    const ctx = await resolveContext({ headers });
    // After both bearer schemes fail, returns null (no cookie session in this
    // path because we provided headers explicitly which bypasses the auth()
    // call). Let me re-check: when authHeader is present, we never reach the
    // cookie path. So this returns null after JWKS fails.
    expect(ctx).toBeNull();
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
  });

  it('returns null when JWT names a tenant the user has no membership in', async () => {
    // Defensive guard: a stolen / stale / buggy JWT must NOT be able to grant
    // authority for a (user, tenant) pair where the membership row has been
    // removed. The HS256 bearer path must refuse and return null. Without
    // this guard, the bearer branch would mint an AppContext containing the
    // JWT-declared scopes for an unauthorized tenant.
    membershipReturnsNull = true;
    const token = await signMobileJWT({
      userId: 'cu1',
      tenantId: 't_no_member',
      scopes: ['sales.read'],
    });
    const headers = new Headers({ authorization: `Bearer ${token}` });
    // After HS256 refuses, JWKS will be tried — provide a rejection so it
    // also fails, to assert the bearer scope did not leak.
    mockVerifyToken.mockRejectedValue(new Error('jwks miss'));

    const ctx = await resolveContext({ headers });

    // Both bearer schemes refused → null. Critical assertion: the JWT-declared
    // 'sales.read' scope MUST NOT appear anywhere in the resolved context.
    expect(ctx).toBeNull();
  });
});
