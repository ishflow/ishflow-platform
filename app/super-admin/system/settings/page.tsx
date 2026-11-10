import Link from 'next/link';

import { AddSettingForm } from '@/components/app/super-admin/system/add-setting-form';
import { CronRunsCard } from '@/components/app/super-admin/system/cron-runs-card';
import { EnvStatusCard } from '@/components/app/super-admin/system/env-status-card';
import { PlatformSettingsTable } from '@/components/app/super-admin/system/platform-settings-table';
import { buttonVariants } from '@/components/ui/button';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { listCronRuns, listKnownCrons } from '@/platform/super-admin/system/cron-runs';
import { getEnvVarStatus } from '@/platform/super-admin/system/env-status';
import { getSuperAdminProMessages } from '@/platform/super-admin/system/messages';
import { listPlatformSettings } from '@/platform/super-admin/system/platform-settings';
import { deletePlatformSettingAction, upsertPlatformSetting } from '../actions';

export const dynamic = 'force-dynamic';

export default async function SuperAdminSettingsPage() {
  await assertSuperAdmin();
  const [messages, rows, envGroups, cronRuns, cronSchedules] = await Promise.all([
    getSuperAdminProMessages(),
    listPlatformSettings(),
    Promise.resolve(getEnvVarStatus()),
    listCronRuns(20),
    listKnownCrons(),
  ]);
  const m = messages.system;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{m.settings.title}</h1>
        <p className="text-sm text-muted-foreground">{m.settings.subtitle}</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/super-admin/system"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {m.tabs.overview}
        </Link>
        <Link
          href="/super-admin/system/settings"
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          {m.tabs.settings}
        </Link>
        <Link
          href="/super-admin/system/api-keys"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {m.tabs.apiKeys}
        </Link>
      </nav>

      <PlatformSettingsTable
        rows={rows}
        onSubmit={upsertPlatformSetting}
        onDelete={deletePlatformSettingAction}
        labels={{
          rowsTitle: m.settings.rowsTitle,
          rowsDescription: m.settings.rowsDescription,
          keyColumn: m.settings.keyColumn,
          valueColumn: m.settings.valueColumn,
          updatedAtColumn: m.settings.updatedAtColumn,
          updatedByColumn: m.settings.updatedByColumn,
          save: m.settings.save,
          delete: m.settings.delete,
          empty: m.settings.empty,
          confirmDeleteTitle: m.settings.confirmDeleteTitle,
          confirmDeleteBody: m.settings.confirmDeleteBody,
          confirmDeleteYes: m.settings.confirmDeleteYes,
          confirmDeleteCancel: m.settings.confirmDeleteCancel,
          errorInvalidJson: m.settings.errorInvalidJson,
        }}
      />

      <AddSettingForm
        onSubmit={upsertPlatformSetting}
        labels={{
          addTitle: m.settings.addTitle,
          addDescription: m.settings.addDescription,
          keyLabel: m.settings.keyLabel,
          valueLabel: m.settings.valueLabel,
          keyPlaceholder: m.settings.keyPlaceholder,
          valuePlaceholder: m.settings.valuePlaceholder,
          create: m.settings.create,
          errorInvalidJson: m.settings.errorInvalidJson,
          errorEmptyKey: m.settings.errorEmptyKey,
        }}
      />

      <EnvStatusCard
        groups={envGroups}
        labels={{
          envTitle: m.settings.envTitle,
          envDescription: m.settings.envDescription,
          envConfigured: m.settings.envConfigured,
          envMissing: m.settings.envMissing,
        }}
      />

      <CronRunsCard
        rows={cronRuns}
        schedules={cronSchedules}
        labels={{
          title: m.cron.title,
          description: m.cron.description,
          schedulesTitle: m.cron.schedulesTitle,
          schedulesDescription: m.cron.schedulesDescription,
          job: m.cron.job,
          schedule: m.cron.schedule,
          lastRun: m.cron.lastRun,
          status: m.cron.status,
          startedAt: m.cron.startedAt,
          duration: m.cron.duration,
          errorMessage: m.cron.errorMessage,
          empty: m.cron.empty,
          neverRan: m.cron.neverRan,
        }}
      />
    </div>
  );
}
