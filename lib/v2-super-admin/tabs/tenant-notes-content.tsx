import { SaNoteList } from '@/components/v2/super-admin/tenants/sa-note-list';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaTenantNotes } from '@/lib/v2-super-admin/load-tenant-notes';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function renderTenantNotesTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, rows] = await Promise.all([
    getTranslations('v2_super_admin.tenants.detail.notes'),
    loadSaTenantNotes(id),
  ]);

  const notes = rows.map((r) => ({
    id: r.id,
    body: r.body,
    when: formatTimestamp(r.createdAt),
    author: r.createdByName ?? '—',
  }));

  const i18n = {
    addPlaceholder: t('addPlaceholder'),
    addButton: t('addButton'),
    adding: t('adding'),
    empty: t('empty'),
    deleteAria: t('deleteAria'),
    confirmTitle: t('confirmTitle'),
    confirmDescription: t('confirmDescription'),
    cancel: t('cancel'),
    confirmDelete: t('confirmDelete'),
  };

  return (
    <SaTenantSection title={t('title')} subtitle={t('subtitle', { count: notes.length })}>
      <SaNoteList tenantId={id} notes={notes} i18n={i18n} />
    </SaTenantSection>
  );
}
