import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { getTranslations } from 'next-intl/server';
import { OpeningStockWizard } from './wizard';

const KEYS = [
  'step1',
  'step2',
  'step3',
  'warehouseLabel',
  'chooseWarehouse',
  'noWarehouses',
  'dropTitle',
  'dropMeta',
  'parsing',
  'parsed',
  'errors',
  'back',
  'runImport',
  'importing',
  'resultTitle',
  'posted',
  'skipped',
  'failed',
  'downloadErrors',
  'startOver',
] as const;

export default async function OpeningStockPage() {
  const ctx = await requireTenantContext();

  const { listRecords } = await import('@/platform/engine');
  const { getRegistry } = await import('@/platform/metadata');
  await import('@/configs/inventory/catalogs/warehouse');
  const whConfig = getRegistry().catalog['inventory.warehouse'];
  const records = whConfig ? await listRecords(ctx, whConfig) : [];
  const whs = records.map((w) => ({
    id: String((w as { id?: unknown }).id),
    name: String((w as { name?: unknown }).name),
  }));

  const t = await getTranslations('v2_addons.openingStock');
  const labels = Object.fromEntries(KEYS.map((k) => [k, t(k)]));
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <OpeningStockWizard warehouses={whs} labels={labels} />
      </div>
    </>
  );
}
