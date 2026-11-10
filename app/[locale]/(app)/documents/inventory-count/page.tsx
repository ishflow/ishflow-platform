import { V2InventoryCountList } from '@/components/v2/documents-extra/inventory-count/list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2InventoryCountListPage() {
  const t = await getTranslations('v2_documents_extra.inventoryCount');
  const count = 0;

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { count })}
      />
      <div className="content">
        <V2InventoryCountList
          columns={{
            no: t('list.col.no'),
            warehouse: t('list.col.warehouse'),
            date: t('list.col.date'),
            diffQty: t('list.col.diffQty'),
            diffAmount: t('list.col.diffAmount'),
            status: t('list.col.status'),
          }}
          statuses={[
            { key: 'all', label: t('list.status.all'), count: 0 },
            { key: 'success', label: t('list.status.posted'), count: 0 },
            { key: 'warning', label: t('list.status.saved'), count: 0 },
          ]}
          searchPlaceholder={t('list.search')}
          filterLabel={t('list.filter')}
          exportLabel={t('list.export')}
          newLabel={t('list.new')}
          newHref="/documents/inventory-count/new"
          rows={[]}
        />
      </div>
    </>
  );
}
