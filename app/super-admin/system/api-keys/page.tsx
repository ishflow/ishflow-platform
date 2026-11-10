import Link from 'next/link';

import { ApiKeysTable } from '@/components/app/super-admin/system/api-keys-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { listApiKeysAcrossTenants } from '@/platform/super-admin/system/api-keys';
import { getSuperAdminProMessages } from '@/platform/super-admin/system/messages';
import { revokeApiKeyAction } from './actions';

export const dynamic = 'force-dynamic';

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SuperAdminApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertSuperAdmin();
  const sp = await searchParams;
  const tenantId = pickFirst(sp.tenantId)?.trim() || undefined;
  const includeRevoked = pickFirst(sp.includeRevoked) === '1';

  const [messages, rows] = await Promise.all([
    getSuperAdminProMessages(),
    listApiKeysAcrossTenants({ tenantId, includeRevoked }),
  ]);
  const m = messages.system;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{m.apiKeys.title}</h1>
        <p className="text-sm text-muted-foreground">{m.apiKeys.subtitle}</p>
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
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {m.tabs.settings}
        </Link>
        <Link
          href="/super-admin/system/api-keys"
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          {m.tabs.apiKeys}
        </Link>
      </nav>

      <form
        method="GET"
        action="/super-admin/system/api-keys"
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-tenant">{m.apiKeys.filterTenant}</Label>
          <Input
            id="filter-tenant"
            name="tenantId"
            defaultValue={tenantId ?? ''}
            placeholder="00000000-0000-0000-0000-000000000000"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="includeRevoked"
              value="1"
              defaultChecked={includeRevoked}
              className="h-4 w-4 rounded border border-input bg-background"
            />
            <span>{includeRevoked ? m.apiKeys.hideRevoked : m.apiKeys.showRevoked}</span>
          </label>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">{m.apiKeys.apply}</Button>
          <Link
            href="/super-admin/system/api-keys"
            className={buttonVariants({ variant: 'ghost' })}
          >
            {m.apiKeys.reset}
          </Link>
        </div>
      </form>

      <ApiKeysTable
        rows={rows}
        onRevoke={revokeApiKeyAction}
        labels={{
          tableTitle: m.apiKeys.tableTitle,
          tenantColumn: m.apiKeys.tenantColumn,
          nameColumn: m.apiKeys.nameColumn,
          prefixColumn: m.apiKeys.prefixColumn,
          scopeColumn: m.apiKeys.scopeColumn,
          createdAtColumn: m.apiKeys.createdAtColumn,
          createdByColumn: m.apiKeys.createdByColumn,
          lastUsedColumn: m.apiKeys.lastUsedColumn,
          statusColumn: m.apiKeys.statusColumn,
          active: m.apiKeys.active,
          revoked: m.apiKeys.revoked,
          neverUsed: m.apiKeys.neverUsed,
          revoke: m.apiKeys.revoke,
          empty: m.apiKeys.empty,
          confirmRevokeTitle: m.apiKeys.confirmRevokeTitle,
          confirmRevokeBody: m.apiKeys.confirmRevokeBody,
          confirmRevokeYes: m.apiKeys.confirmRevokeYes,
          confirmRevokeCancel: m.apiKeys.confirmRevokeCancel,
        }}
      />
    </div>
  );
}
