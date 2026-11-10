import { AddonToggleCard } from '@/components/app/super-admin/addon-toggle-card';
import { ADDON_CATALOG, ADDON_KEYS, getAddonLabels } from '@/platform/addons';
import { withBypass } from '@/platform/db/tenant-context';
import { getSuperAdminDict, getSuperAdminLocale } from '@/platform/super-admin/i18n-server';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Params = Promise<{ tenantId: string }>;

export default async function TenantAddonsPage({ params }: { params: Params }) {
  const { tenantId } = await params;
  const [overview, dict, locale] = await Promise.all([
    getTenantOverview(tenantId),
    getSuperAdminDict(),
    getSuperAdminLocale(),
  ]);
  if (!overview) notFound();

  const rows = await withBypass(async (tx) =>
    tx.tenantAddon.findMany({
      where: { tenantId },
      include: {
        // `enabled_by` is a free-form UUID — no Prisma relation declared on
        // TenantAddon. We resolve names separately below.
      },
    }),
  );

  const enabledByIds = Array.from(new Set(rows.map((r) => r.enabledBy)));
  const users =
    enabledByIds.length > 0
      ? await withBypass(async (tx) =>
          tx.user.findMany({
            where: { id: { in: enabledByIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          }),
        )
      : [];
  const nameById = new Map(
    users.map((u) => {
      const full = [u.firstName ?? '', u.lastName ?? ''].join(' ').trim();
      return [u.id, full.length > 0 ? full : u.email] as const;
    }),
  );

  const rowByKey = new Map(rows.map((r) => [r.addonKey, r] as const));

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h2 className="text-lg font-semibold">{dict.addons.pageTitle}</h2>
        <p className="text-sm text-muted-foreground">{dict.addons.pageDescription}</p>
      </header>

      <div className="grid gap-3">
        {ADDON_KEYS.map((key) => {
          const entry = ADDON_CATALOG[key];
          const labels = getAddonLabels(key, locale);
          const row = rowByKey.get(key);
          const state = row
            ? {
                enabled: true,
                enabledAt: row.enabledAt?.toISOString() ?? null,
                enabledByName: nameById.get(row.enabledBy) ?? null,
                expiresAt: row.expiresAt?.toISOString() ?? null,
                notes: row.notes ?? null,
              }
            : {
                enabled: false,
                enabledAt: null,
                enabledByName: null,
                expiresAt: null,
                notes: null,
              };
          return (
            <AddonToggleCard
              key={key}
              tenantId={tenantId}
              addonKey={key}
              status={entry.status}
              title={labels.title}
              description={labels.description}
              row={state}
              dict={dict.addons}
            />
          );
        })}
      </div>
    </div>
  );
}
