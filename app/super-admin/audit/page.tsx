import { AuditProFilters } from '@/components/app/super-admin/audit/audit-pro-filters';
import { AuditProTable } from '@/components/app/super-admin/audit/audit-pro-table';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import {
  type AuditProFilters as AuditProFilterValues,
  listAuditPro,
  listDistinctEntities,
} from '@/platform/super-admin/audit-pro/list-audit-pro';
import {
  type SavedFilterCriteria,
  listSavedFilters,
} from '@/platform/super-admin/audit-pro/saved-filters';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getSuperAdminProDict } from '@/platform/super-admin/pro-messages';
import { deleteAuditFilter, saveAuditFilter } from './actions';

export const dynamic = 'force-dynamic';

const ACTION_ALL_VALUE = '__all__';
const ACTION_OPTIONS = [
  'plan.changed',
  'gate.flipped',
  'impersonate.start',
  'impersonate.end',
  'audit.csv_exported',
  'audit.saved_filter_created',
  'audit.saved_filter_deleted',
  'user.password_reset_sent',
  'user.sessions_revoked',
  'user.session_revoked',
  'user.soft_deleted',
] as const;

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function applySavedHref(criteria: SavedFilterCriteria): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(criteria)) {
    if (typeof v === 'string' && v.trim()) params.set(k, v.trim());
  }
  const qs = params.toString();
  return qs ? `/super-admin/audit?${qs}` : '/super-admin/audit';
}

export default async function SuperAdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await assertSuperAdmin();

  const action =
    pickFirst(sp.action) && pickFirst(sp.action) !== ACTION_ALL_VALUE
      ? pickFirst(sp.action)
      : undefined;
  const entity =
    pickFirst(sp.entity) && pickFirst(sp.entity) !== ACTION_ALL_VALUE
      ? pickFirst(sp.entity)
      : undefined;
  const category =
    pickFirst(sp.category) && pickFirst(sp.category) !== ACTION_ALL_VALUE
      ? pickFirst(sp.category)
      : undefined;
  const actorClerkId = pickFirst(sp.actorClerkId)?.trim() || undefined;
  const tenantId = pickFirst(sp.tenantId)?.trim() || undefined;
  const q = pickFirst(sp.q)?.trim() || undefined;
  const from = pickFirst(sp.from)?.trim() || undefined;
  const to = pickFirst(sp.to)?.trim() || undefined;
  const cursor = pickFirst(sp.cursor)?.trim() || undefined;

  const filters: AuditProFilterValues = {
    action,
    actorClerkId,
    tenantId,
    entity,
    category,
    q,
    from,
    to,
  };

  const [{ rows, nextCursor }, entityOptions, savedFilters, dict, proDict] = await Promise.all([
    listAuditPro(filters, { cursor }),
    listDistinctEntities(),
    listSavedFilters(ctx.user.clerkId),
    getSuperAdminDict(),
    getSuperAdminProDict(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.audit.title}</h1>
        <p className="text-sm text-muted-foreground">{dict.audit.subtitle}</p>
      </header>
      <AuditProFilters
        filters={filters}
        entityOptions={entityOptions}
        actionOptions={ACTION_OPTIONS}
        baseFilterLabels={dict.audit.filters}
        proLabels={proDict.audit.filters}
        savedFilters={savedFilters}
        applySavedHref={applySavedHref}
        saveAction={saveAuditFilter}
        deleteAction={deleteAuditFilter}
      />
      <AuditProTable rows={rows} nextCursor={nextCursor} filters={filters} dict={dict} />
    </div>
  );
}
