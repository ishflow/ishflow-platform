import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';
import { OneCImportWizard } from './wizard';

const KEYS = [
  'step1',
  'step2',
  'step3',
  'dropTitle',
  'dropMeta',
  'choose',
  'parsing',
  'foundProducts',
  'foundCounterparties',
  'warnings',
  'targetLabel',
  'targetCustomers',
  'targetSuppliers',
  'targetBoth',
  'back',
  'runImport',
  'importing',
  'resultTitle',
  'inserted',
  'skipped',
  'failed',
  'downloadErrors',
  'startOver',
] as const;

export default async function OneCImportPage() {
  const t = await getTranslations('v2_addons.oneCImport');
  const labels = Object.fromEntries(KEYS.map((k) => [k, t(k)]));
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <OneCImportWizard labels={labels} />
      </div>
    </>
  );
}
