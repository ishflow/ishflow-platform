import { V2OrgImport } from '@/components/v2/admin/org-import';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2OrgImportPage() {
  const t = await getTranslations('v2_admin.orgImport');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2OrgImport
          labels={{
            sectionTitle: t('sectionTitle'),
            sectionSub: t('sectionSub'),
            sourcesTitle: t('sourcesTitle'),
            sources: [
              {
                id: 'csv',
                icon: 'csv',
                title: t('sources.csv.title'),
                desc: t('sources.csv.desc'),
              },
              {
                id: 'xlsx',
                icon: 'xlsx',
                title: t('sources.xlsx.title'),
                desc: t('sources.xlsx.desc'),
              },
              {
                id: '1c',
                icon: '1c',
                title: t('sources.oneC.title'),
                desc: t('sources.oneC.desc'),
              },
              {
                id: 'demo',
                icon: 'demo',
                title: t('sources.demo.title'),
                desc: t('sources.demo.desc'),
              },
            ],
            dropTitle: t('dropTitle'),
            dropMeta: t('dropMeta'),
            progressLink: t('progressLink'),
          }}
        />
      </div>
    </>
  );
}
