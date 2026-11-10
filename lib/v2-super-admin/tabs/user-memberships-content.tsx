import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaUser } from '@/lib/v2-super-admin/load-sa-user';
import { Link } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Full memberships tab — same data as the overview snippet but presented as
 * a complete tenant-by-tenant breakdown. Each row links to the tenant detail
 * page. Role names joined with comma when a user holds multiple roles in one
 * tenant.
 */
export async function renderUserMembershipsTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, user] = await Promise.all([
    getTranslations('v2_super_admin.users.detail.memberships'),
    loadSaUser(id),
  ]);
  if (!user) notFound();

  const empty = t.has('empty') ? t('empty') : 'No tenant memberships.';
  const noRoleLabel = t.has('noRole') ? t('noRole') : 'no role';

  return (
    <SaTenantSection
      title={t('title')}
      subtitle={t('subtitle', { count: user.memberships.length })}
    >
      {user.memberships.length === 0 ? (
        <SaTenantInfoRow k="—" v={<span style={{ color: 'var(--text-muted)' }}>{empty}</span>} />
      ) : (
        user.memberships.map((m) => (
          <SaTenantInfoRow
            key={m.membershipId}
            k={formatDate(m.joinedAt)}
            v={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href={`/super-admin/tenants/${m.tenantId}`} style={{ fontWeight: 600 }}>
                  {m.tenantName}
                </Link>
                <span className="dim" style={{ color: 'var(--text-muted)' }}>
                  /{m.tenantSlug}
                </span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                  {m.roleNames.length > 0 ? m.roleNames.join(', ') : noRoleLabel}
                </span>
              </div>
            }
          />
        ))
      )}
    </SaTenantSection>
  );
}
