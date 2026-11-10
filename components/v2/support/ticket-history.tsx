import { Badge } from '@/components/ui/badge';
import type { TenantSupportTicket } from '@/platform/support';
import type { SupportTicketStatus } from '@prisma/client';
import { useTranslations } from 'next-intl';

const statusVariant: Record<
  SupportTicketStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  open: 'default',
  in_progress: 'secondary',
  resolved: 'outline',
  wont_fix: 'destructive',
};

function isoDate(dt: Date | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type Props = {
  tickets: TenantSupportTicket[];
};

export function V2TicketHistory({ tickets }: Props) {
  const t = useTranslations('v2_support');

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">{t('history.title')}</h2>

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('history.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-lg border border-border bg-card p-4 text-card-foreground"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{ticket.subject}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusVariant[ticket.status]}>
                    {t(`history.status.${ticket.status}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{isoDate(ticket.createdAt)}</span>
                </div>
              </div>

              {ticket.resolution ? (
                <div className="mt-3 rounded-md bg-muted/50 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t('history.resolution.label')}
                    {ticket.resolvedAt ? ` · ${isoDate(ticket.resolvedAt)}` : ''}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.resolution}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
