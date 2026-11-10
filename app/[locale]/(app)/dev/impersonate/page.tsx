import {
  DEV_BYPASS_TENANT_COOKIE,
  DEV_BYPASS_USER_COOKIE,
  isDevAuthBypassActive,
} from '@/platform/auth/dev-bypass';
import { withBypass } from '@/platform/db/tenant-context';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { clearImpersonation, setImpersonation } from './_actions/impersonate';

export const dynamic = 'force-dynamic';

type TenantOption = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
};

type UserOption = {
  id: string;
  email: string;
  fullName: string;
  isDeleted: boolean;
  memberships: Array<{ tenantId: string; tenantName: string; roleNames: string[] }>;
};

/**
 * Dev-only impersonator: pick a tenant + user, set cookies, reload the app.
 * Triple-guarded by isDevAuthBypassActive() — returns 404 in production or
 * when DEV_AUTH_BYPASS is unset.
 *
 * Lists every demo-sa-* tenant + every user with at least one membership.
 * The picker constrains user→tenant pairings: when both are selected, the
 * dev-bypass layer verifies the user has a membership in that tenant; if
 * not, falls back to the sentinel dev user so you never end up in a tenant
 * you have no access to.
 */
export default async function Page() {
  if (!isDevAuthBypassActive()) notFound();

  const jar = await cookies();
  const activeTenantId = jar.get(DEV_BYPASS_TENANT_COOKIE)?.value ?? '';
  const activeUserId = jar.get(DEV_BYPASS_USER_COOKIE)?.value ?? '';

  const { tenants, users } = await withBypass(async (tx) => {
    type TenantRow = { id: string; name: string; slug: string; plan: string; status: string };
    type UserRow = {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      deletedAt: Date | null;
      memberships: Array<{
        tenantId: string;
        tenant: { id: string; name: string };
        roles: Array<{ name: string }>;
      }>;
    };
    const txAny = tx as Record<string, unknown>;
    const tenantClient = txAny.tenant as {
      findMany: (args: unknown) => Promise<TenantRow[]>;
    };
    const userClient = txAny.user as {
      findMany: (args: unknown) => Promise<UserRow[]>;
    };
    const [tenantRows, userRows] = await Promise.all([
      tenantClient.findMany({
        where: { slug: { startsWith: 'demo-sa-' }, deletedAt: null },
        select: { id: true, name: true, slug: true, plan: true, status: true },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      }),
      userClient.findMany({
        where: { memberships: { some: {} } },
        include: {
          memberships: {
            include: {
              tenant: { select: { id: true, name: true } },
              roles: { select: { name: true } },
            },
          },
        },
        orderBy: [{ firstName: 'asc' }],
      }),
    ]);

    const tenantOpts: TenantOption[] = tenantRows.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
    }));
    const userOpts: UserOption[] = userRows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName:
        [u.firstName, u.lastName].filter((p): p is string => Boolean(p?.trim())).join(' ') ||
        u.email,
      isDeleted: u.deletedAt !== null,
      memberships: u.memberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        roleNames: m.roles.map((r) => r.name),
      })),
    }));
    return { tenants: tenantOpts, users: userOpts };
  });

  const activeUser = users.find((u) => u.id === activeUserId);
  const activeTenant = tenants.find((t) => t.id === activeTenantId);

  return (
    <div style={{ maxWidth: 760, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Dev impersonator</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
        Pick a tenant + user to impersonate via the dev-bypass cookies. Cookies are 7-day
        persistence, localhost only. Header overrides win when both are set.
      </p>

      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Active</h2>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <div>
            Tenant:{' '}
            <b style={{ color: 'var(--text)' }}>{activeTenant?.name ?? 'dev-bypass (default)'}</b>
            {activeTenant ? (
              <span>
                {' '}
                ({activeTenant.plan}/{activeTenant.status})
              </span>
            ) : null}
          </div>
          <div>
            User:{' '}
            <b style={{ color: 'var(--text)' }}>
              {activeUser?.fullName ?? 'dev-bypass@localhost (default)'}
            </b>
            {activeUser?.memberships.find((m) => m.tenantId === activeTenantId)?.roleNames
              .length ? (
              <span>
                {' '}
                roles:{' '}
                {activeUser.memberships
                  .find((m) => m.tenantId === activeTenantId)
                  ?.roleNames.join(', ')}
              </span>
            ) : null}
          </div>
        </div>
        {activeTenantId || activeUserId ? (
          <form action={clearImpersonation} style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-sm btn-secondary">
              Clear impersonation
            </button>
          </form>
        ) : null}
      </section>

      <form
        action={setImpersonation}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Switch</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          <label htmlFor="tenantId" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Tenant
          </label>
          <select
            id="tenantId"
            name="tenantId"
            defaultValue={activeTenantId}
            style={{
              padding: '8px 10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            <option value="">— dev-bypass default —</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.plan}/{t.status})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          <label htmlFor="userId" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            User
          </label>
          <select
            id="userId"
            name="userId"
            defaultValue={activeUserId}
            style={{
              padding: '8px 10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            <option value="">— dev-bypass default —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} · {u.email}
                {u.isDeleted ? ' (deleted)' : ''}
                {' · '}
                {u.memberships.length} membership{u.memberships.length === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 }}>
          When the picked user has no membership in the picked tenant, the dev-bypass layer silently
          falls back to the sentinel user so the app never crashes on a missing membership.
        </p>

        <button type="submit" className="btn btn-primary">
          Apply &amp; reload dashboard
        </button>
      </form>

      <details style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 12.5 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          curl equivalent (CI / scripts)
        </summary>
        <pre
          style={{
            background: 'var(--surface-2)',
            padding: 12,
            borderRadius: 8,
            marginTop: 8,
            fontSize: 11.5,
            overflowX: 'auto',
          }}
        >
          {`curl -H 'x-dev-bypass-tenant: <tenant-uuid>' \\
     -H 'x-dev-bypass-user: <user-uuid>' \\
     http://localhost:3100/tr/dashboard`}
        </pre>
      </details>
    </div>
  );
}
