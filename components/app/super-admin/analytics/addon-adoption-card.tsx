import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AddonAdoptionRow } from '@/platform/super-admin/analytics/addon-adoption';

interface AddonAdoptionCardProps {
  rows: AddonAdoptionRow[];
  total: number;
  dict: {
    title: string;
    description: string;
    empty: string;
    columns: { addon: string; enabled: string; total: string; pct: string };
  };
}

export function AddonAdoptionCard({ rows, total, dict }: AddonAdoptionCardProps) {
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
              <TableHead className="w-[35%]">{dict.columns.addon}</TableHead>
              <TableHead className="w-[15%] text-right">{dict.columns.enabled}</TableHead>
              <TableHead className="w-[15%] text-right">{dict.columns.total}</TableHead>
              <TableHead>{dict.columns.pct}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.addonKey}>
                <TableCell className="font-mono text-xs text-foreground">{r.addonKey}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {r.enabled}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {total}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Progress value={r.pct} className="h-2 flex-1" />
                    <span className="w-12 text-right font-mono text-xs tabular-nums">
                      {r.pct.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
