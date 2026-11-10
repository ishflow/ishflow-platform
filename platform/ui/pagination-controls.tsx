import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';

export function PaginationControls({
  page,
  total,
  pageSize,
  basePath,
  query,
  labels,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  query?: string;
  labels: { prev: string; next: string; pageHint: string };
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(p));
    return `${basePath}?${params.toString()}`;
  };

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground">{labels.pageHint}</span>
      <Link
        href={prevDisabled ? '#' : href(page - 1)}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : 0}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          prevDisabled && 'pointer-events-none opacity-50',
        )}
      >
        {labels.prev}
      </Link>
      <Link
        href={nextDisabled ? '#' : href(page + 1)}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : 0}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          nextDisabled && 'pointer-events-none opacity-50',
        )}
      >
        {labels.next}
      </Link>
    </div>
  );
}
