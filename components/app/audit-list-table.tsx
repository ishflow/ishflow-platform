'use client';

import { TabOpenLink } from '@/components/app/tabs/tab-open-link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export type AuditListRow = {
  id: string;
  createdAt: Date;
  /** Raw entity code e.g. `document.sales.invoice`. */
  entity: string;
  /** Localized, human-friendly label derived from navManifest. */
  entityLabel: string;
  /**
   * Href to the target entity's detail page when resolvable from navManifest,
   * otherwise null. The record-id cell stays plain text when null OR when
   * action === 'delete' (target no longer exists).
   */
  entityHref: string | null;
  /** Full record UUID (used for link target). */
  entityId: string;
  /** Short prefix of entityId shown in the cell. */
  entityIdShort: string;
  action: string;
  actionLabel: string;
  userEmail: string | null;
};

function actionBadgeClass(action: string): string {
  switch (action) {
    case 'create':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400';
    case 'update':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
    case 'delete':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400';
    case 'post':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    case 'unpost':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function AuditListTable({
  rows,
  detailBasePath,
}: {
  rows: AuditListRow[];
  /** Base path for the audit-entry detail page, e.g. `/tr/admin/audit`. */
  detailBasePath: string;
}) {
  const t = useTranslations('admin.audit');
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columnTimestamp')}</TableHead>
            <TableHead>{t('columnEntity')}</TableHead>
            <TableHead>{t('columnEntityId')}</TableHead>
            <TableHead>{t('columnAction')}</TableHead>
            <TableHead>{t('columnUser')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const recordLinkable = r.entityHref !== null && r.action !== 'delete';
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <TabOpenLink
                    href={`${detailBasePath}/${r.id}`}
                    className="text-primary hover:underline"
                    tabTitle={r.createdAt.toLocaleString()}
                  >
                    {r.createdAt.toLocaleString()}
                  </TabOpenLink>
                </TableCell>
                <TableCell>{r.entityLabel}</TableCell>
                <TableCell>
                  {recordLinkable ? (
                    <TabOpenLink
                      href={`${r.entityHref}/${r.entityId}`}
                      className="text-primary hover:underline"
                      tabTitle={`${r.entityLabel} ${r.entityIdShort}`}
                    >
                      {r.entityIdShort}
                    </TabOpenLink>
                  ) : (
                    <span className="text-muted-foreground">{r.entityIdShort}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={cn(actionBadgeClass(r.action))} variant="outline">
                    {r.actionLabel}
                  </Badge>
                </TableCell>
                <TableCell>{r.userEmail ?? '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
