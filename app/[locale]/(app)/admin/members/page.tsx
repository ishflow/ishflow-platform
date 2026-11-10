import { V2MembersList } from '@/components/v2/admin/members/list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { pickPrimaryRoleName } from '@/platform/auth/pick-primary-role';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { clerkClient } from '@clerk/nextjs/server';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const AVATAR_PALETTE = [
  '#1E40AF',
  '#7C3AED',
  '#16A34A',
  '#DC2626',
  '#0EA5E9',
  '#F59E0B',
  '#A21CAF',
  '#0F766E',
  '#475569',
];

// DB role.name (snake_case) → i18n key under v2_admin.members.role
const ROLE_KEY_MAP: Record<string, string> = {
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

function roleKeyFor(name: string): string {
  return ROLE_KEY_MAP[name] ?? 'viewer';
}

function roleTone(name: string): 'info' | 'neutral' {
  // System / privileged roles use info; sales/warehouse use neutral, matching the
  // visual rhythm of the SAMPLE_MEMBERS that this page was scaffolded from.
  return name === 'sales' || name === 'warehouse' || name === 'buyer' ? 'neutral' : 'info';
}

function initialsFor(firstName: string | null, lastName: string | null, email: string): string {
  const a = (firstName ?? '').trim().charAt(0);
  const b = (lastName ?? '').trim().charAt(0);
  const ab = `${a}${b}`.toUpperCase();
  if (ab.length > 0) return ab;
  return email.slice(0, 2).toUpperCase();
}

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length] ?? '#475569';
}

function lastSeenKey(now: Date, when: Date | null): string {
  if (!when) return 'monthAgo1';
  const diffMs = now.getTime() - when.getTime();
  const min = diffMs / 60000;
  const hr = min / 60;
  const day = hr / 24;
  if (min < 5) return 'justNow';
  if (hr < 2) return 'hoursAgo1';
  if (hr < 3) return 'hoursAgo2';
  if (hr < 8) return 'hoursAgo4';
  if (day < 2) return 'yesterday';
  if (day < 4) return 'daysAgo3';
  if (day < 7) return 'daysAgo7';
  if (day < 14) return 'weekAgo1';
  if (day < 28) return 'weekAgo2';
  return 'monthAgo1';
}

function inviteAgeKey(now: Date, when: Date): string {
  const days = (now.getTime() - when.getTime()) / (24 * 60 * 60 * 1000);
  if (days < 2) return 'daysAgo2';
  if (days < 4) return 'daysAgo3';
  return 'daysAgo7';
}

function readSystemRole(publicMetadata: Record<string, unknown> | undefined): string {
  if (!publicMetadata) return 'viewer';
  const v = publicMetadata.systemRole;
  return typeof v === 'string' ? v : 'viewer';
}

export default async function V2MembersPage() {
  const t = await getTranslations('v2_admin.members');
  const locale = await getLocale();
  const tRel = await getTranslations('v2_admin.members.rel');
  const tRoles = await getTranslations('v2_admin.members.role');

  let tenantId = '';
  let callerUserId = '';
  let clerkOrgId: string | null = null;
  let canManage = false;
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant.id;
    callerUserId = ctx.user.id;
    clerkOrgId = ctx.tenant.clerkOrgId ?? null;
    canManage = hasPermission(ctx.permissions, 'admin.members:manage');
  } catch {
    // Unauthenticated — render chrome with empty list.
  }

  // Members management is admin-only — block a direct URL hit by a role that
  // can reach the page some other way (e.g. an admin-rail click). The nav
  // already hides the Members item for non-managers.
  if (tenantId && !canManage) notFound();

  // Assignable roles (admins only) — drives the per-row role selector. `owner`
  // is excluded; it is minted via the workspace bootstrap, never assigned here.
  let roleOptions: { id: string; name: string; label: string }[] = [];
  if (tenantId && canManage) {
    try {
      const roles = await withTenant(tenantId, (tx) =>
        tx.role.findMany({
          orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
          select: { id: true, name: true },
        }),
      );
      roleOptions = roles
        .filter((r) => r.name !== 'owner')
        .map((r) => ({
          id: r.id,
          name: r.name,
          label: r.name in ROLE_KEY_MAP ? tRoles(roleKeyFor(r.name)) : r.name,
        }));
    } catch {
      roleOptions = [];
    }
  }

  const loadMemberships = (tid: string) =>
    withTenant(tid, (tx) =>
      tx.membership.findMany({
        include: { user: true, roles: true },
        orderBy: { createdAt: 'asc' },
      }),
    );

  let memberships: Awaited<ReturnType<typeof loadMemberships>> = [];
  if (tenantId) {
    try {
      memberships = await loadMemberships(tenantId);
    } catch {
      // Transient DB outage (e.g. a Neon connection drop) — degrade to an empty
      // list instead of throwing the whole page into Next's global-error screen,
      // matching how `renderV2Settings` tolerates an unreachable DB.
      memberships = [];
    }
  }

  // Pending invites: pulled from Clerk (V1 admin/members works the same way).
  // Best-effort — never block the page on Clerk errors.
  type ClerkInvite = {
    id: string;
    emailAddress: string;
    createdAt: number;
    publicMetadata?: Record<string, unknown>;
    raw?: unknown;
  };
  let invitations: ClerkInvite[] = [];
  const inviterMap = new Map<
    string,
    { firstName: string | null; lastName: string | null; email: string | null }
  >();
  if (clerkOrgId) {
    try {
      const clerk = await clerkClient();
      const list = await clerk.organizations.getOrganizationInvitationList({
        organizationId: clerkOrgId,
        status: ['pending'],
      });
      invitations = list.data.map((inv) => ({
        id: inv.id,
        emailAddress: inv.emailAddress,
        createdAt: inv.createdAt,
        publicMetadata: inv.publicMetadata as Record<string, unknown> | undefined,
        raw: inv.raw,
      }));
      const inviterIds = [
        ...new Set(
          invitations
            .map((inv) => {
              const r = inv.raw;
              if (r && typeof r === 'object' && 'created_by' in r) {
                const v = (r as { created_by?: unknown }).created_by;
                return typeof v === 'string' ? v : null;
              }
              return null;
            })
            .filter((v): v is string => !!v),
        ),
      ];
      if (inviterIds.length > 0) {
        const inviters = await clerk.users.getUserList({
          userId: inviterIds,
          limit: inviterIds.length,
        });
        for (const u of inviters.data) {
          inviterMap.set(u.id, {
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.primaryEmailAddress?.emailAddress ?? null,
          });
        }
      }
    } catch {
      // ignore — Clerk dev sometimes 404s on freshly-created orgs
    }
  }

  const now = new Date();
  const members = memberships.map((m) => {
    const u = m.user;
    const fullName =
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
      u.email.split('@')[0] ||
      u.email;
    const primaryRoleName = pickPrimaryRoleName(m.roles.map((r) => ({ name: r.name })));
    const key = roleKeyFor(primaryRoleName);
    const primaryRole = m.roles.find((r) => r.name === primaryRoleName);
    return {
      id: m.id,
      name: fullName,
      initials: initialsFor(u.firstName, u.lastName, u.email),
      color: colorFor(u.id),
      email: u.email,
      role: tRoles(key),
      roleTone: roleTone(primaryRoleName),
      roleId: primaryRole?.id ?? '',
      lastSeen: tRel(lastSeenKey(now, u.updatedAt)),
      isYou: u.id === callerUserId,
    };
  });

  const invites = invitations.map((inv) => {
    const systemRole = readSystemRole(inv.publicMetadata);
    const key = roleKeyFor(systemRole);
    const inviterId =
      inv.raw && typeof inv.raw === 'object' && 'created_by' in inv.raw
        ? (((inv.raw as { created_by?: unknown }).created_by as string | undefined) ?? null)
        : null;
    const inviter = inviterId ? inviterMap.get(inviterId) : null;
    const invitedByName = inviter
      ? [inviter.firstName, inviter.lastName].filter(Boolean).join(' ').trim() ||
        inviter.email ||
        '—'
      : '—';
    const created = new Date(inv.createdAt);
    return {
      id: inv.id,
      email: inv.emailAddress,
      systemRole,
      invitedBy: t('list.invitedBy', { name: invitedByName }),
      invitedAt: created.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      role: tRoles(key),
      roleTone: roleTone(systemRole),
      ageLabel: tRel(inviteAgeKey(now, created)),
    };
  });

  const activeCount = members.length;
  const invitesCount = invites.length;
  const pageTo = Math.min(activeCount, 25);

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { active: activeCount, invites: invitesCount })}
      />
      <div className="content">
        <V2MembersList
          labels={{
            chipActive: t('list.chipActive'),
            chipAllRoles: t('list.chipAllRoles'),
            chipSuspended: t('list.chipSuspended'),
            searchPh: t('list.searchPh'),
            filterRole: t('list.filterRole'),
            invite: t('list.invite'),
            columns: {
              name: t('list.col.name'),
              email: t('list.col.email'),
              role: t('list.col.role'),
              lastSeen: t('list.col.lastSeen'),
              status: t('list.col.status'),
            },
            youSuffix: t('list.youSuffix'),
            statusActive: t('list.statusActive'),
            pageInfo: t('list.pageInfo', {
              from: activeCount > 0 ? 1 : 0,
              to: pageTo,
              total: activeCount,
            }),
            invitesTitle: t('list.invitesTitle'),
            invitesRefresh: t('list.invitesRefresh'),
            invitesInviteCta: t('list.invitesInviteCta'),
            invitesResend: t('list.invitesResend'),
            invitesCancelAria: t('list.invitesCancelAria'),
            removeMember: t('list.removeMember'),
            removeMemberConfirm: t('list.removeMemberConfirm'),
            rowMenuAria: t('list.rowMenuAria'),
          }}
          counts={{ active: activeCount, suspended: 0, invites: invitesCount }}
          members={members}
          invites={invites}
          inviteHref="/admin/members/invite"
          roleOptions={roleOptions}
          canManage={canManage}
        />
      </div>
    </>
  );
}
