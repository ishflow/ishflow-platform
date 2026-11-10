import { AccountMenu } from '@/components/v2/shell/account-menu';
import { resolveContext } from '@/platform/auth/current-context';
import { pickPrimaryRoleName } from '@/platform/auth/pick-primary-role';
import { isPlatformAdmin } from '@/platform/auth/platform-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

// DB role name → `v2_admin.members.role` i18n key (mirrors the members page).
const ROLE_KEY: Record<string, string> = {
  owner: 'owner',
  admin: 'admin',
  chief_accountant: 'chiefAccountant',
  bookkeeper: 'accountant',
  cashier: 'cashier',
  sales: 'salesManager',
  buyer: 'purchaser',
  warehouse: 'warehouse',
  viewer: 'viewer',
};

export async function V2AvatarPill() {
  const ctx = await resolveContext();
  const userName =
    [ctx?.user?.firstName, ctx?.user?.lastName].filter(Boolean).join(' ') || ctx?.user?.email || '';
  const initials = (userName || 'U').slice(0, 2).toUpperCase();

  // Public chrome (no session) — keep the static, non-interactive pill.
  if (!ctx?.user) {
    return <div className="avatar-pill">{initials}</div>;
  }

  // Organizations the signed-in user belongs to — drives the in-menu switcher.
  // Roles come along so the menu can show the user's role in the active org.
  const rows = await withBypass((tx) =>
    tx.membership.findMany({
      where: { userId: ctx.user.id, tenant: { deletedAt: null } },
      select: {
        tenant: { select: { id: true, name: true, clerkOrgId: true } },
        roles: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  );

  const activeTenantId = ctx.tenant?.id ?? '';
  const activeRow = rows.find((r) => r.tenant.id === activeTenantId);
  let roleLabel = '';
  if (activeRow && activeRow.roles.length > 0) {
    const roleName = pickPrimaryRoleName(activeRow.roles.map((r) => ({ name: r.name })));
    const tRoles = await getTranslations('v2_admin.members.role');
    roleLabel = roleName in ROLE_KEY ? tRoles(ROLE_KEY[roleName] ?? 'viewer') : roleName;
  }

  return (
    <AccountMenu
      userName={userName}
      userEmail={ctx.user.email ?? ''}
      userInitials={initials}
      activeTenantId={activeTenantId}
      tenants={rows.map((r) => r.tenant)}
      isPlatformAdmin={isPlatformAdmin(ctx)}
      roleLabel={roleLabel}
    />
  );
}
