import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CronRunRow, KnownCron } from '@/platform/super-admin/system/cron-runs';

function formatTimestamp(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'success') return 'outline';
  if (status === 'failed' || status === 'error') return 'destructive';
  if (status === 'running') return 'secondary';
  return 'outline';
}

export function CronRunsCard({
  rows,
  schedules,
  labels,
}: {
  rows: ReadonlyArray<CronRunRow>;
  schedules: ReadonlyArray<KnownCron>;
  labels: {
    title: string;
    description: string;
    schedulesTitle: string;
    schedulesDescription: string;
    job: string;
    schedule: string;
    lastRun: string;
    status: string;
    startedAt: string;
    duration: string;
    errorMessage: string;
    empty: string;
    neverRan: string;
  };
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{labels.schedulesTitle}</CardTitle>
          <CardDescription>{labels.schedulesDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.job}</TableHead>
                <TableHead>{labels.schedule}</TableHead>
                <TableHead>{labels.lastRun}</TableHead>
                <TableHead>{labels.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((c) => (
                <TableRow key={c.path}>
                  <TableCell className="font-mono text-xs text-foreground">{c.jobName}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.schedule}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                    {c.lastRunAt ? formatTimestamp(c.lastRunAt) : labels.neverRan}
                  </TableCell>
                  <TableCell>
                    {c.lastRunStatus ? (
                      <Badge variant={statusVariant(c.lastRunStatus)} className="font-mono text-xs">
                        {c.lastRunStatus}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.job}</TableHead>
                  <TableHead>{labels.startedAt}</TableHead>
                  <TableHead>{labels.duration}</TableHead>
                  <TableHead>{labels.status}</TableHead>
                  <TableHead className="w-[40%]">{labels.errorMessage}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-foreground">{r.jobName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                      {formatTimestamp(r.startedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {formatDuration(r.durationMs)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)} className="font-mono text-xs">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.errorMessage ?? r.output ?? ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
