import { DistributionCard } from '@/components/app/super-admin/mobile/distribution-card';
import { MinVersionsForm } from '@/components/app/super-admin/mobile/min-versions-form';
import { PushTokensTable } from '@/components/app/super-admin/mobile/push-tokens-table';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import {
  getPlatformDistribution,
  listDevicePushTokens,
} from '@/platform/super-admin/mobile/device-push-tokens';
import { getMinAppVersions } from '@/platform/super-admin/mobile/min-versions';
import { getSuperAdminProMessages } from '@/platform/super-admin/system/messages';
import { sendTestPushAction, updateMinAppVersions } from './actions';

export const dynamic = 'force-dynamic';

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SuperAdminMobilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertSuperAdmin();
  const sp = await searchParams;
  const tenantId = pickFirst(sp.tenantId)?.trim() || undefined;
  const cursor = pickFirst(sp.cursor)?.trim() || undefined;

  const [messages, tokens, distribution, minVersions] = await Promise.all([
    getSuperAdminProMessages(),
    listDevicePushTokens({ tenantId, cursor, limit: 50 }),
    getPlatformDistribution(),
    getMinAppVersions(),
  ]);
  const m = messages.mobile;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
        <p className="text-sm text-muted-foreground">{m.subtitle}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <MinVersionsForm
          current={minVersions}
          onSubmit={updateMinAppVersions}
          labels={{
            title: m.minVersions.title,
            description: m.minVersions.description,
            iosLabel: m.minVersions.iosLabel,
            androidLabel: m.minVersions.androidLabel,
            placeholder: m.minVersions.placeholder,
            save: m.minVersions.save,
            saved: m.minVersions.saved,
            clear: m.minVersions.clear,
          }}
        />
        <DistributionCard
          rows={distribution}
          labels={{
            title: m.distribution.title,
            description: m.distribution.description,
            platformLabel: m.distribution.platformLabel,
            countLabel: m.distribution.countLabel,
            empty: m.distribution.empty,
          }}
        />
      </section>

      <PushTokensTable
        rows={tokens.rows}
        nextCursor={tokens.nextCursor}
        filterTenantId={tenantId ?? ''}
        onSendTest={sendTestPushAction}
        labels={{
          title: m.tokens.title,
          description: m.tokens.description,
          filterTenant: m.tokens.filterTenant,
          apply: m.tokens.apply,
          reset: m.tokens.reset,
          tenantColumn: m.tokens.tenantColumn,
          userColumn: m.tokens.userColumn,
          platformColumn: m.tokens.platformColumn,
          deviceColumn: m.tokens.deviceColumn,
          tokenColumn: m.tokens.tokenColumn,
          createdAtColumn: m.tokens.createdAtColumn,
          lastUsedColumn: m.tokens.lastUsedColumn,
          sendTest: m.tokens.sendTest,
          empty: m.tokens.empty,
          loadMore: m.tokens.loadMore,
          testTitle: m.tokens.testTitle,
          testDescription: m.tokens.testDescription,
          testTitleField: m.tokens.testTitleField,
          testBodyField: m.tokens.testBodyField,
          testTitleDefault: m.tokens.testTitleDefault,
          testBodyDefault: m.tokens.testBodyDefault,
          testSend: m.tokens.testSend,
          testCancel: m.tokens.testCancel,
          testSentToast: m.tokens.testSentToast,
          testFailedToast: m.tokens.testFailedToast,
        }}
      />
    </div>
  );
}
