import { SaMemberRow } from '@/components/v2/super-admin/tenants/sa-member-row';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaTenantMembers } from '@/lib/v2-super-admin/load-tenant-members';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

export async function renderTenantUsersTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, data] = await Promise.all([
    getTranslations('v2_super_admin.tenants.detail.usersTab'),
    loadSaTenantMembers(id),
  ]);

  const i18n = {
    saving: t('saving'),
    removeAria: t('removeAria'),
    removeTitle: t('removeTitle'),
    removeDescription: t('removeDescription'),
    removeConfirm: t('removeConfirm'),
    cancel: t('cancel'),
    noRolePlaceholder: t('noRolePlaceholder'),
  };

  return (
    <SaTenantSection
      title={t('title')}
      subtitle={t('subtitle', { count: data.members.length })}
      action={
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled
          title={t('inviteDeferred')}
        >
          {t('invite')}
        </button>
      }
    >
      {data.members.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('empty')}</p>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>{t('col.name')}</th>
              <th>{t('col.email')}</th>
              <th>{t('col.role')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => (
              <SaMemberRow
                key={m.membershipId}
                tenantId={id}
                membershipId={m.membershipId}
                fullName={m.fullName ?? m.email}
                email={m.email}
                currentRoleId={m.roleIds[0] ?? null}
                availableRoles={data.availableRoles}
                i18n={i18n}
              />
            ))}
          </tbody>
        </table>
      )}
    </SaTenantSection>
  );
}
