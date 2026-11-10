import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  deltaLabel?: string;
  delta?: number;
};

export function KpiCard({ label, value, deltaLabel, delta }: Props) {
  const direction = delta === undefined ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {delta !== undefined && deltaLabel && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
              direction === 'up' && 'text-emerald-600 dark:text-emerald-400',
              direction === 'down' && 'text-rose-600 dark:text-rose-400',
              direction === 'flat' && 'text-muted-foreground',
            )}
          >
            <Icon className="h-3 w-3" />
            {Math.abs(delta).toFixed(1)}% · {deltaLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
