import { TenantsTable, type TenantsTableFilters } from '@/components/app/super-admin/tenants-table';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { listTenants } from '@/platform/super-admin/list-tenants';
import type { TenantPlan, TenantStatus } from '@prisma/client';

const VALID_PLANS: ReadonlyArray<TenantPlan> = ['free', 'starter', 'pro', 'business', 'enterprise'];
const VALID_STATUSES: ReadonlyArray<TenantStatus> = [
  'active',
  'trialing',
  'past_due',
  'suspended',
  'cancelled',
];

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePlan(raw: string | undefined): TenantPlan | undefined {
  if (!raw) return undefined;
  return (VALID_PLANS as ReadonlyArray<string>).includes(raw) ? (raw as TenantPlan) : undefined;
}

function parseStatus(raw: string | undefined): TenantStatus | undefined {
  if (!raw) return undefined;
  return (VALID_STATUSES as ReadonlyArray<string>).includes(raw)
    ? (raw as TenantStatus)
    : undefined;
}

export default async function SuperAdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = pickFirst(sp.q)?.trim() || undefined;
  const plan = parsePlan(pickFirst(sp.plan));
  const status = parseStatus(pickFirst(sp.status));
  const cursor = pickFirst(sp.cursor);

  const [{ rows, nextCursor }, dict] = await Promise.all([
    listTenants({ q, plan, status, cursor }),
    getSuperAdminDict(),
  ]);

  const filters: TenantsTableFilters = {
    q: q ?? '',
    plan: plan ?? '',
    status: status ?? '',
  };

  const t = dict.tenants;
  let subtitle: string;
  if (rows.length === 0) {
    subtitle = t.subtitleEmpty;
  } else {
    const tpl = rows.length === 1 ? t.subtitleCountOne : t.subtitleCountMany;
    subtitle = tpl.replace('{count}', String(rows.length));
    if (nextCursor) subtitle += t.subtitleMoreAvailable;
    subtitle += '.';
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>
      <TenantsTable rows={rows} nextCursor={nextCursor} filters={filters} dict={dict} />
    </div>
  );
}
