import { type AuditRow, type AuditType, V2AuditList } from '@/components/v2/admin/audit/list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import type { Prisma } from '@prisma/client';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

// Map raw audit_log.action (lowercase, snake_case) onto the V2AuditList action
// vocabulary that drives icon + colour. writeAudit currently emits a small
// fixed set (create/update/delete/post/unpost + api_* variants); anything else
// falls back to 'settings'.
function mapAction(raw: string): AuditRow['action'] {
  const a = raw.toLowerCase();
  if (a === 'create' || a === 'api_create') return 'create';
  if (a === 'update' || a === 'api_update') return 'update';
  if (a === 'delete' || a === 'api_delete') return 'delete';
  if (a === 'post') return 'post';
  if (a === 'unpost') return 'post';
  if (a === 'post_fail') return 'post_fail';
  if (a === 'login') return 'login';
  if (a === 'webhook') return 'webhook';
  if (a === 'cron') return 'cron';
  if (a === 'invite') return 'invite';
  return 'settings';
}

// V2 audit message keys are uppercase enum names; api_* normalize to their
// base verb so we don't need duplicate translations.
function actionTranslationKey(raw: string): string {
  const a = raw.toLowerCase();
  if (a === 'api_create') return 'CREATE';
  if (a === 'api_update') return 'UPDATE';
  if (a === 'api_delete') return 'DELETE';
  if (a === 'unpost') return 'POST';
  return a.toUpperCase();
}

function formatTs(d: Date): string {
  // 17.05 09:42:18 — short date, short clock; matches the SAMPLE format.
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}.${mm} ${hh}:${mi}:${ss}`;
}

// WHERE clause for each type chip. Kept in one place so the chip counts and the
// findMany filter stay in lock-step.
//  - doc     = post/unpost/post_fail OR entity startsWith document_ / catalog_
//  - user    = login / invite
//  - system  = webhook / cron
//  - setting = everything else
function typeWhere(type: AuditType): Prisma.AuditLogWhereInput {
  switch (type) {
    case 'doc':
      return {
        OR: [
          { action: { in: ['post', 'unpost', 'post_fail'] } },
          { entity: { startsWith: 'document_' } },
          { entity: { startsWith: 'catalog_' } },
        ],
      };
    case 'user':
      return { action: { in: ['login', 'invite'] } };
    case 'system':
      return { action: { in: ['webhook', 'cron'] } };
    case 'setting':
      return {
        AND: [
          {
            action: {
              notIn: ['post', 'unpost', 'post_fail', 'login', 'invite', 'webhook', 'cron'],
            },
          },
          { entity: { not: { startsWith: 'document_' } } },
          { entity: { not: { startsWith: 'catalog_' } } },
        ],
      };
    default:
      return {};
  }
}

function parseType(raw: string | undefined): AuditType {
  if (raw === 'doc' || raw === 'user' || raw === 'system' || raw === 'setting') return raw;
  return 'all';
}

// Parse a YYYY-MM-DD date input into a Date, returning undefined for blanks /
// invalid values so the filter is simply skipped.
function parseDate(raw: string | undefined, endOfDay = false): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(`${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function V2AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const t = await getTranslations('v2_admin.audit');
  const tAct = await getTranslations('v2_admin.audit.action');

  const { type: typeRaw, q, from: fromRaw, to: toRaw, page: pageRaw } = await searchParams;
  const type = parseType(typeRaw);
  const search = (q ?? '').trim();
  const fromDate = parseDate(fromRaw, false);
  const toDate = parseDate(toRaw, true);
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);

  let tenantId = '';
  let perms = new Set<string>();
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant.id;
    perms = ctx.permissions;
  } catch {
    // Unauthenticated — render chrome with empty list.
  }
  // The /admin subtree layout admits any admin permission (members/audit/
  // period/organization). The audit trail is sealed to owner/admin — gate it
  // explicitly so a partial-admin (e.g. chief_accountant, who holds
  // admin.period:manage) can't read before/after JSON. Finding H1.
  if (tenantId && !hasPermission(perms, 'admin.audit:read')) notFound();

  // Combine type / search / date filters into a single WHERE for findMany+count.
  const searchWhere: Prisma.AuditLogWhereInput = search
    ? {
        OR: [
          { entity: { contains: search, mode: 'insensitive' } },
          { entityId: { contains: search, mode: 'insensitive' } },
          { user: { is: { firstName: { contains: search, mode: 'insensitive' } } } },
          { user: { is: { lastName: { contains: search, mode: 'insensitive' } } } },
          { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
        ],
      }
    : {};
  const dateWhere: Prisma.AuditLogWhereInput =
    fromDate || toDate
      ? {
          createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) },
        }
      : {};
  const listWhere: Prisma.AuditLogWhereInput = {
    AND: [typeWhere(type), searchWhere, dateWhere],
  };

  const data = tenantId
    ? await withTenant(tenantId, async (tx) => {
        const [rows, total, docCount, userCount, systemCount, settingCount] = await Promise.all([
          tx.auditLog.findMany({
            where: listWhere,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          }),
          tx.auditLog.count({ where: listWhere }),
          tx.auditLog.count({ where: typeWhere('doc') }),
          tx.auditLog.count({ where: typeWhere('user') }),
          tx.auditLog.count({ where: typeWhere('system') }),
          tx.auditLog.count({ where: typeWhere('setting') }),
        ]);
        const allCount = await tx.auditLog.count();
        return { rows, total, allCount, docCount, userCount, systemCount, settingCount };
      })
    : {
        rows: [],
        total: 0,
        allCount: 0,
        docCount: 0,
        userCount: 0,
        systemCount: 0,
        settingCount: 0,
      };

  const rows: AuditRow[] = data.rows.map((r) => {
    const u = r.user;
    const userLabel = u
      ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'system'
      : 'system';
    const action = mapAction(r.action);
    return {
      id: r.id,
      ts: formatTs(r.createdAt),
      user: userLabel,
      action,
      actionLabel: tAct(actionTranslationKey(r.action)),
      target: {
        href: `/admin/audit/${r.id}`,
        text: `${r.entity}/${r.entityId}`,
        mono: true,
      },
    };
  });

  const from = data.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, data.total);

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle')}
      />
      <div className="content">
        <V2AuditList
          labels={{
            chipAll: t('list.chipAll'),
            chipDoc: t('list.chipDoc'),
            chipUser: t('list.chipUser'),
            chipSystem: t('list.chipSystem'),
            chipSetting: t('list.chipSetting'),
            searchPh: t('list.searchPh'),
            dateFrom: t('list.dateFrom'),
            dateTo: t('list.dateTo'),
            csvExport: t('list.csvExport'),
            columns: {
              ts: t('list.col.ts'),
              user: t('list.col.user'),
              action: t('list.col.action'),
              target: t('list.col.target'),
            },
            pageInfo: t('list.pageInfo', { from, to, total: data.total }),
            empty: t('list.empty'),
            prev: t('list.prev'),
            next: t('list.next'),
          }}
          counts={{
            all: data.allCount,
            doc: data.docCount,
            user: data.userCount,
            system: data.systemCount,
            setting: data.settingCount,
          }}
          rows={rows}
          activeType={type}
          search={search}
          from={fromRaw ?? ''}
          to={toRaw ?? ''}
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
        />
      </div>
    </>
  );
}
