import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import type { BillingEvent } from '@prisma/client';

interface Props {
  events: ReadonlyArray<BillingEvent>;
  dict: SuperAdminDict['subscription']['timeline'];
}

function formatTimestamp(date: Date): string {
  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

export function BillingEventTimeline({ events, dict }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.empty}</p>
        ) : (
          <ul className="-mt-3">
            {events.map((event) => {
              const isManual = event.type.startsWith('manual.');
              const timestamp = event.processedAt ?? event.createdAt;
              return (
                <li key={event.id} className="flex items-start gap-3 border-b py-3 last:border-0">
                  <Badge
                    variant={isManual ? 'outline' : 'secondary'}
                    className="mt-0.5 shrink-0 font-mono"
                  >
                    {event.type}
                  </Badge>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="truncate font-mono text-sm font-medium text-foreground"
                        title={event.stripeEventId}
                      >
                        {event.stripeEventId}
                      </p>
                      {event.processingError ? (
                        <Badge variant="destructive">{dict.errorBadge}</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatTimestamp(timestamp)}
                    </p>
                    {event.processingError ? (
                      <pre className="mt-1 overflow-x-auto rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                        {event.processingError}
                      </pre>
                    ) : null}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted-foreground select-none">
                        {dict.payload}
                      </summary>
                      <pre className="mt-2 overflow-x-auto rounded-md border bg-muted p-2 text-xs leading-snug">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
