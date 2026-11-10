import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function PaymentDirectionBadge({ direction }: { direction: 'in' | 'out' }) {
  const t = useTranslations('payment.direction');
  const Icon = direction === 'in' ? ArrowDownCircle : ArrowUpCircle;
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border-transparent',
        direction === 'in' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        direction === 'out' && 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {direction === 'in' ? t('in') : t('out')}
    </Badge>
  );
}
