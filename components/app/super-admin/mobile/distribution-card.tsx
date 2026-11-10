import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { PlatformDistribution } from '@/platform/super-admin/mobile/device-push-tokens';

const intFormatter = new Intl.NumberFormat('en-US');

export function DistributionCard({
  rows,
  labels,
}: {
  rows: ReadonlyArray<PlatformDistribution>;
  labels: {
    title: string;
    description: string;
    platformLabel: string;
    countLabel: string;
    empty: string;
  };
}) {
  const total = rows.reduce((acc, r) => acc + r.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const pct = total > 0 ? (row.count / total) * 100 : 0;
              return (
                <li key={row.platform} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-sm text-foreground">{row.platform}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {intFormatter.format(row.count)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
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
