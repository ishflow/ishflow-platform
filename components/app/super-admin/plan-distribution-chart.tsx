import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { TenantPlan } from '@prisma/client';

const PLAN_ORDER: ReadonlyArray<TenantPlan> = ['free', 'starter', 'pro', 'business', 'enterprise'];

export function PlanDistributionChart({
  planDistribution,
  labels,
}: {
  planDistribution: Record<TenantPlan, number>;
  labels: Record<TenantPlan, string>;
}) {
  const counts = PLAN_ORDER.map((p) => planDistribution[p] ?? 0);
  const max = Math.max(1, ...counts);
  const total = counts.reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {PLAN_ORDER.map((plan) => {
          const count = planDistribution[plan] ?? 0;
          const pct = (count / max) * 100;
          const share = total === 0 ? 0 : (count / total) * 100;
          return (
            <div key={plan} className="flex items-center gap-4">
              <div className="flex w-32 shrink-0 items-center gap-2">
                <Badge variant="outline" className="font-medium">
                  {labels[plan]}
                </Badge>
              </div>
              <Progress value={pct} className="flex-1" />
              <div className="flex w-24 shrink-0 items-baseline justify-end gap-2 tabular-nums">
                <span className="text-sm font-semibold text-foreground">{count}</span>
                <span className="text-xs text-muted-foreground">{share.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
