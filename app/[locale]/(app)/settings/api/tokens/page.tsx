import { V2ApiTokens } from '@/components/v2/settings/api-tokens';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';
import { listApiTokensAction } from './actions';

export default async function V2ApiTokensPage() {
  const t = await getTranslations('v2_settings.apiTokensPage');
  const tokens = await listApiTokensAction();
  const apiBaseUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://ishflow.com'}/api/v1`;
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2ApiTokens initialTokens={tokens} apiBaseUrl={apiBaseUrl} />
      </div>
    </>
  );
}
