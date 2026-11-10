import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DbStats } from '@/platform/super-admin/system/db-stats';

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${SIZE_UNITS[exp]}`;
}

const intFormatter = new Intl.NumberFormat('en-US');

export function DbStatsCard({
  stats,
  labels,
}: {
  stats: DbStats;
  labels: {
    title: string;
    description: string;
    totalSize: string;
    connections: string;
    topTables: string;
    schemaColumn: string;
    tableColumn: string;
    sizeColumn: string;
    rowsColumn: string;
    unavailable: string;
    unavailableHint: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!stats.available ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{labels.unavailable}</p>
            {stats.unavailableReason ? (
              <p className="mt-1 text-xs">
                {labels.unavailableHint.replace('{reason}', stats.unavailableReason)}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{labels.totalSize}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {formatBytes(stats.totalBytes)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{labels.connections}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {intFormatter.format(stats.connectionCount)}
                </div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-foreground">{labels.topTables}</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.schemaColumn}</TableHead>
                    <TableHead>{labels.tableColumn}</TableHead>
                    <TableHead className="text-right">{labels.sizeColumn}</TableHead>
                    <TableHead className="text-right">{labels.rowsColumn}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topTables.map((row) => (
                    <TableRow key={`${row.schema}.${row.table}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.schema}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.table}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBytes(row.bytes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {intFormatter.format(row.rowEstimate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
