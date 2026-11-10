import Link from 'next/link';

import { CronRunsCard } from '@/components/app/super-admin/system/cron-runs-card';
import { DbStatsCard } from '@/components/app/super-admin/system/db-stats-card';
import { DeployInfoCard } from '@/components/app/super-admin/system/deploy-info-card';
import { MaintenanceForm } from '@/components/app/super-admin/system/maintenance-form';
import { ReadonlyForm } from '@/components/app/super-admin/system/readonly-form';
import { SlowQueriesCard } from '@/components/app/super-admin/system/slow-queries-card';
import { buttonVariants } from '@/components/ui/button';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { listCronRuns, listKnownCrons } from '@/platform/super-admin/system/cron-runs';
import { getDbStats, getSlowQueries } from '@/platform/super-admin/system/db-stats';
import { getDeployInfo } from '@/platform/super-admin/system/deploy-info';
import { getMaintenanceState, getReadonlyEnabled } from '@/platform/super-admin/system/maintenance';
import { getSuperAdminProMessages } from '@/platform/super-admin/system/messages';
import { updateMaintenanceMode, updateReadonlyMode } from './actions';

export const dynamic = 'force-dynamic';

export default async function SuperAdminSystemPage() {
  await assertSuperAdmin();
  const [
    messages,
    dbStats,
    slowQueries,
    cronRuns,
    cronSchedules,
    deployInfo,
    maintenance,
    readonly,
  ] = await Promise.all([
    getSuperAdminProMessages(),
    getDbStats(),
    getSlowQueries(),
    listCronRuns(50),
    listKnownCrons(),
    getDeployInfo(),
    getMaintenanceState(),
    getReadonlyEnabled(),
  ]);
  const m = messages.system;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
        <p className="text-sm text-muted-foreground">{m.subtitle}</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/super-admin/system"
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          {m.tabs.overview}
        </Link>
        <Link
          href="/super-admin/system/settings"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
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

      <section className="grid gap-4 lg:grid-cols-2">
        <DbStatsCard
          stats={dbStats}
          labels={{
            title: m.dbCard.title,
            description: m.dbCard.description,
            totalSize: m.dbCard.totalSize,
            connections: m.dbCard.connections,
            topTables: m.dbCard.topTables,
            schemaColumn: m.dbCard.schemaColumn,
            tableColumn: m.dbCard.tableColumn,
            sizeColumn: m.dbCard.sizeColumn,
            rowsColumn: m.dbCard.rowsColumn,
            unavailable: m.dbCard.unavailable,
            unavailableHint: m.dbCard.unavailableHint,
          }}
        />
        <DeployInfoCard
          info={deployInfo}
          labels={{
            title: m.deploy.title,
            description: m.deploy.description,
            deploymentId: m.deploy.deploymentId,
            url: m.deploy.url,
            state: m.deploy.state,
            createdAt: m.deploy.createdAt,
            gitSha: m.deploy.gitSha,
            unavailable: m.deploy.unavailable,
            fallbackReason: m.deploy.fallbackReason,
          }}
        />
      </section>

      <SlowQueriesCard
        result={slowQueries}
        labels={{
          title: m.slowQueries.title,
          description: m.slowQueries.description,
          enableHint: m.slowQueries.enableHint,
          queryColumn: m.slowQueries.queryColumn,
          callsColumn: m.slowQueries.callsColumn,
          totalColumn: m.slowQueries.totalColumn,
          meanColumn: m.slowQueries.meanColumn,
          empty: m.slowQueries.empty,
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

      <section className="grid gap-4 lg:grid-cols-2">
        <MaintenanceForm
          current={maintenance}
          onSubmit={updateMaintenanceMode}
          labels={{
            title: m.maintenance.title,
            description: m.maintenance.description,
            currentlyEnabled: m.maintenance.currentlyEnabled,
            currentlyDisabled: m.maintenance.currentlyDisabled,
            toggleLabel: m.maintenance.toggleLabel,
            untilLabel: m.maintenance.untilLabel,
            messageLabel: m.maintenance.messageLabel,
            save: m.maintenance.save,
            confirmTitle: m.maintenance.confirmTitle,
            confirmBody: m.maintenance.confirmBody,
            confirmDisableTitle: m.maintenance.confirmDisableTitle,
            confirmDisableBody: m.maintenance.confirmDisableBody,
            confirmYes: m.maintenance.confirmYes,
            confirmCancel: m.maintenance.confirmCancel,
          }}
        />
        <ReadonlyForm
          current={readonly}
          onSubmit={updateReadonlyMode}
          labels={{
            title: m.readonly.title,
            description: m.readonly.description,
            currentlyEnabled: m.readonly.currentlyEnabled,
            currentlyDisabled: m.readonly.currentlyDisabled,
            toggleLabel: m.readonly.toggleLabel,
            save: m.readonly.save,
            confirmTitle: m.readonly.confirmTitle,
            confirmBody: m.readonly.confirmBody,
            confirmDisableTitle: m.readonly.confirmDisableTitle,
            confirmDisableBody: m.readonly.confirmDisableBody,
            confirmYes: m.readonly.confirmYes,
            confirmCancel: m.readonly.confirmCancel,
          }}
        />
      </section>
    </div>
  );
}
