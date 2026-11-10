'use client';

import { Button } from '@/components/ui/button';
import { Check, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type BulkAction = {
  kind: 'delete' | 'post';
  label: string;
  onRun: () => void;
  disabled?: boolean;
};

type Props = {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
};

/**
 * Floating action bar shown whenever the list DataTable has at least one
 * selected row. Renders shadcn Button primitives only.
 */
export function BulkActionBar({ selectedCount, onClear, actions }: Props) {
  const t = useTranslations('common');
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <span className="text-sm text-muted-foreground">
        {t('selected', { count: selectedCount })}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <Button
            key={a.kind}
            type="button"
            size="sm"
            variant={a.kind === 'delete' ? 'destructive' : 'default'}
            disabled={a.disabled}
            onClick={a.onRun}
          >
            {a.kind === 'delete' ? (
              <Trash2 className="mr-2 h-4 w-4" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {a.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          {t('clearSelection')}
        </Button>
      </div>
    </div>
  );
}
