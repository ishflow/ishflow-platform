import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { CohortRow } from '@/platform/super-admin/analytics/cohort';

interface CohortCardProps {
  rows: CohortRow[];
  dict: {
    title: string;
    description: string;
    header: string;
    week1: string;
    week2: string;
    week4: string;
    week8: string;
    week12: string;
    empty: string;
    cohortColumn: string;
    sizeColumn: string;
  };
}

function pct(value: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((value / total) * 100)}%`;
}

function heatmap(value: number, total: number): string {
  if (total === 0) return 'bg-muted/30';
  const ratio = value / total;
  if (ratio >= 0.66) return 'bg-primary/30 text-foreground';
  if (ratio >= 0.33) return 'bg-primary/15 text-foreground';
  if (ratio > 0) return 'bg-primary/5 text-muted-foreground';
  return 'bg-muted/30 text-muted-foreground';
}

export function CohortCard({ rows, dict }: CohortCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      {rows.length === 0 ? (
        <CardHeader>
          <CardDescription>{dict.empty}</CardDescription>
        </CardHeader>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">{dict.cohortColumn}</TableHead>
              <TableHead className="w-[12%]">{dict.sizeColumn}</TableHead>
              <TableHead className="text-center">{dict.week1}</TableHead>
              <TableHead className="text-center">{dict.week2}</TableHead>
              <TableHead className="text-center">{dict.week4}</TableHead>
              <TableHead className="text-center">{dict.week8}</TableHead>
              <TableHead className="text-center">{dict.week12}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.cohortStart}>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {r.cohortStart}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">{r.size}</TableCell>
                {(['w1', 'w2', 'w4', 'w8', 'w12'] as const).map((k) => (
                  <TableCell
                    key={k}
                    className={cn(
                      'text-center font-mono text-xs tabular-nums',
                      heatmap(r.retention[k], r.size),
                    )}
                  >
                    {pct(r.retention[k], r.size)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
