import { type DiffLine, V2AuditDetail } from '@/components/v2/admin/audit/detail';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Map raw audit_log.action onto the V2 action vocabulary (matches list page).
function actionTranslationKey(raw: string): string {
  const a = raw.toLowerCase();
  if (a === 'api_create') return 'CREATE';
  if (a === 'api_update') return 'UPDATE';
  if (a === 'api_delete') return 'DELETE';
  if (a === 'unpost') return 'POST';
  return a.toUpperCase();
}

function formatFullTs(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

// Build DiffLine[] pairs from two JSON payloads. Pretty-prints both sides and
// walks them in parallel, marking matching lines as 'ctx' and differing lines
// as 'del' (left) / 'add' (right). When one side is missing entirely, every
// line on the present side is colored (create → all add; delete → all del).
function buildDiff(
  before: unknown,
  after: unknown,
): { diffBefore: DiffLine[]; diffAfter: DiffLine[] } {
  const stringify = (v: unknown) => (v == null ? '' : JSON.stringify(v, null, 2));
  const beforeText = stringify(before);
  const afterText = stringify(after);
  const beforeLines = beforeText ? beforeText.split('\n') : [];
  const afterLines = afterText ? afterText.split('\n') : [];

  // Both empty → nothing to render.
  if (beforeLines.length === 0 && afterLines.length === 0) {
    return { diffBefore: [], diffAfter: [] };
  }

  // Only one side present → mark all lines as add or del.
  if (beforeLines.length === 0) {
    return {
      diffBefore: [],
      diffAfter: afterLines.map((text, i) => ({ ln: i + 1, kind: 'add', text })),
    };
  }
  if (afterLines.length === 0) {
    return {
      diffBefore: beforeLines.map((text, i) => ({ ln: i + 1, kind: 'del', text })),
      diffAfter: [],
    };
  }

  // Both present → naive line-by-line compare, padding the shorter side with
  // empty lines so the panes line up visually. Equal lines → ctx; otherwise
  // tag the left side 'del' and the right side 'add'.
  const max = Math.max(beforeLines.length, afterLines.length);
  const diffBefore: DiffLine[] = [];
  const diffAfter: DiffLine[] = [];
  for (let i = 0; i < max; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === undefined) {
      diffAfter.push({ ln: i + 1, kind: 'add', text: a ?? '' });
      continue;
    }
    if (a === undefined) {
      diffBefore.push({ ln: i + 1, kind: 'del', text: b });
      continue;
    }
    if (b === a) {
      diffBefore.push({ ln: i + 1, kind: 'ctx', text: b });
      diffAfter.push({ ln: i + 1, kind: 'ctx', text: a });
    } else {
      diffBefore.push({ ln: i + 1, kind: 'del', text: b });
      diffAfter.push({ ln: i + 1, kind: 'add', text: a });
    }
  }
  return { diffBefore, diffAfter };
}

export default async function V2AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('v2_admin.audit.detail');
  const tAct = await getTranslations('v2_admin.audit.action');

  let tenantId = '';
  let perms = new Set<string>();
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant.id;
    perms = ctx.permissions;
  } catch {
    // Unauthenticated — fall through to notFound.
  }
  // Audit trail is sealed to owner/admin (admin.audit:read); gate explicitly so
  // a partial-admin who passes the /admin layout can't read it. Finding H1.
  if (tenantId && !hasPermission(perms, 'admin.audit:read')) notFound();

  const audit = tenantId
    ? await withTenant(tenantId, (tx) =>
        tx.auditLog.findUnique({
          where: { id },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        }),
      )
    : null;

  if (!audit) {
    notFound();
  }

  const userLabel = audit.user
    ? [audit.user.firstName, audit.user.lastName].filter(Boolean).join(' ').trim() ||
      audit.user.email ||
      'system'
    : 'system';
  const userEmail = audit.user?.email ?? '—';
  const targetText = `${audit.entity}/${audit.entityId}`;
  const actionLabel = tAct(actionTranslationKey(audit.action));
  const { diffBefore, diffAfter } = buildDiff(audit.before, audit.after);

  // Related-record links. We can't reliably map every audit entity to its
  // canonical route, so all three resolve to the audit list pre-filtered by a
  // search term — honest, always-valid navigation.
  //  - changed record → entries touching this exact record (entityId)
  //  - actor          → entries by this user (email, or display name)
  //  - same user recent → actor + the last 7 days via ?from=
  const actorTerm = audit.user?.email || userLabel;
  const recentFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const changedRecordHref = `/admin/audit?q=${encodeURIComponent(audit.entityId)}`;
  const actorHref = `/admin/audit?q=${encodeURIComponent(actorTerm)}`;
  const sameUserRecentHref = `/admin/audit?q=${encodeURIComponent(actorTerm)}&from=${recentFrom}`;

  return (
    <>
      <V2Topbar
        breadcrumb={t('breadcrumb', { id: audit.id.slice(0, 8) })}
        title={t('titleUpdate', { target: targetText })}
        subtitle={actionLabel}
      />
      <div className="content">
        <V2AuditDetail
          labels={{
            summary: {
              id: t('summary.id'),
              ts: t('summary.ts'),
              action: t('summary.action'),
              targetType: t('summary.targetType'),
              target: t('summary.target'),
              user: t('summary.user'),
              tenant: t('summary.tenant'),
              exportJson: t('summary.exportJson'),
              copyEvent: t('summary.copyEvent'),
              copied: t('summary.copied'),
            },
            diffTitle: t('diffTitle'),
            diffTabSideBySide: t('diffTabSideBySide'),
            diffTabUnified: t('diffTabUnified'),
            diffTabRaw: t('diffTabRaw'),
            diffBefore: t('diffBefore'),
            diffAfter: t('diffAfter'),
            relatedTitle: t('relatedTitle'),
            relatedItems: {
              changedRecord: t('relatedItems.changedRecord'),
              actor: t('relatedItems.actor'),
              sameUserRecent: t('relatedItems.sameUserRecent'),
            },
          }}
          summary={{
            id: audit.id,
            ts: formatFullTs(audit.createdAt),
            action: actionLabel,
            targetType: audit.entity,
            targetText,
            targetHref: changedRecordHref,
            user: userLabel,
            userEmail,
            tenant: audit.tenantId,
          }}
          diffBefore={diffBefore}
          diffAfter={diffAfter}
          before={audit.before}
          after={audit.after}
          changedRecordHref={changedRecordHref}
          actorHref={actorHref}
          sameUserRecentHref={sameUserRecentHref}
        />
      </div>
    </>
  );
}
