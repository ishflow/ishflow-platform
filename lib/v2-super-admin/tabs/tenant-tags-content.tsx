import { SaTagList } from '@/components/v2/super-admin/tenants/sa-tag-list';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaTenantTags } from '@/lib/v2-super-admin/load-tenant-tags';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

export async function renderTenantTagsTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, tags] = await Promise.all([
    getTranslations('v2_super_admin.tenants.detail.tagsTab'),
    loadSaTenantTags(id),
  ]);

  const i18n = {
    addPlaceholder: t('addPlaceholder'),
    addButton: t('addButton'),
    adding: t('adding'),
    removeAria: t('removeAria'),
    empty: t('empty'),
    duplicate: t('duplicate'),
  };

  return (
    <SaTenantSection title={t('title')} subtitle={t('subtitle')}>
      <SaTagList tenantId={id} tags={tags} i18n={i18n} />
    </SaTenantSection>
  );
}
