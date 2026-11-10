import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';

type Props = {
  kind: 'income' | 'expense' | string;
  label: string;
};

/**
 * Register viewer "Tür" column. income → down-arrow in emerald palette
 * (money coming in), expense → up-arrow in rose (money/stock going out).
 * Unknown kinds render the label with no icon. Both palettes have dark:
 * variants so the badge works in either theme.
 */
export function KindBadge({ kind, label }: Props) {
  const isIncome = kind === 'income';
  const isExpense = kind === 'expense';

  const Icon = isIncome ? ArrowDown : isExpense ? ArrowUp : null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal',
        isIncome &&
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
        isExpense &&
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {label}
    </Badge>
  );
}
