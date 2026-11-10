import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface StatCardDelta {
  label: string;
  positive: boolean;
}

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: StatCardDelta;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
        {(delta || hint) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {delta && (
              <span
                className={cn(
                  'font-medium',
                  delta.positive ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive',
                )}
              >
                {delta.label}
              </span>
            )}
            {hint && <span className={cn(delta && 'ml-1')}>{hint}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
