import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SlowQueriesResult } from '@/platform/super-admin/system/db-stats';

const intFormatter = new Intl.NumberFormat('en-US');

function truncate(query: string, max = 120): string {
  const flat = query.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

export function SlowQueriesCard({
  result,
  labels,
}: {
  result: SlowQueriesResult;
  labels: {
    title: string;
    description: string;
    enableHint: string;
    queryColumn: string;
    callsColumn: string;
    totalColumn: string;
    meanColumn: string;
    empty: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!result.available ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <p className="text-foreground">{labels.enableHint}</p>
            {result.reason ? <p className="mt-1 text-xs">{result.reason}</p> : null}
          </div>
        ) : result.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[55%]">{labels.queryColumn}</TableHead>
                <TableHead className="text-right">{labels.callsColumn}</TableHead>
                <TableHead className="text-right">{labels.totalColumn}</TableHead>
                <TableHead className="text-right">{labels.meanColumn}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row, idx) => (
                <TableRow key={`${idx}-${row.totalMs}`}>
                  <TableCell className="font-mono text-xs text-foreground">
                    {truncate(row.query)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {intFormatter.format(row.calls)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.totalMs.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.meanMs.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
