import { V2DangerZone } from '@/components/v2/admin/danger-zone';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2DangerPage() {
  const t = await getTranslations('v2_admin.danger');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2DangerZone
          labels={{
            introTitle: t('introTitle'),
            introBody: t('introBody'),
            transfer: {
              title: t('transfer.title'),
              name: t('transfer.name'),
              desc: t('transfer.desc'),
              cta: t('transfer.cta'),
            },
            archive: {
              title: t('archive.title'),
              name: t('archive.name'),
              desc: t('archive.desc'),
              confirmHint: t('archive.confirmHint'),
              cta: t('archive.cta'),
            },
            deleteWs: {
              title: t('deleteWs.title'),
              name: t('deleteWs.name'),
              desc: t('deleteWs.desc'),
              confirmHint: t('deleteWs.confirmHint'),
              cta: t('deleteWs.cta'),
            },
            exportAll: {
              title: t('exportAll.title'),
              pillSoon: t('exportAll.pillSoon'),
              name: t('exportAll.name'),
              desc: t('exportAll.desc'),
              cta: t('exportAll.cta'),
            },
            tenantSlugPh: 'sample-trading',
          }}
        />
      </div>
    </>
  );
}
