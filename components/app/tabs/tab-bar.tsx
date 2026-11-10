'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Tab } from './types';
import { useTabs } from './use-tabs';

export function TabBar({
  onCloseRequest,
}: {
  onCloseRequest: (tab: Tab) => void;
}) {
  const t = useTranslations('tabs');
  const { tabs, activeId, focus } = useTabs();

  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label={t('barLabel')}
      className="sticky top-0 z-20 flex min-w-0 items-end gap-1 overflow-hidden border-b bg-muted/40 px-2 pt-1"
    >
      {tabs.map((tab) => (
        <TabChip
          key={tab.id}
          tab={tab}
          active={tab.id === activeId}
          onFocus={() => focus(tab.id)}
          onClose={tab.pinned ? undefined : () => onCloseRequest(tab)}
          closeLabel={t('close')}
        />
      ))}
    </div>
  );
}

function TabChip({
  tab,
  active,
  onFocus,
  onClose,
  closeLabel,
}: {
  tab: Tab;
  active: boolean;
  onFocus: () => void;
  onClose?: () => void;
  closeLabel: string;
}) {
  const label = tab.title || tab.href;
  return (
    <div
      role="tab"
      aria-selected={active}
      aria-controls={`tabpanel-${tab.id}`}
      className={cn(
        // Equal flex basis so the bar proportionally shrinks all chips when
        // space runs out — no horizontal scroll.
        'group relative flex h-9 min-w-0 shrink basis-0 flex-1 cursor-pointer items-center gap-2 rounded-t-md border border-b-0 px-3 text-sm transition-colors',
        tab.pinned ? 'max-w-[140px] flex-none' : 'max-w-[200px]',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-[0_1px_0_hsl(var(--primary))]'
          : 'border-transparent bg-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground',
      )}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onFocus();
      }}
      tabIndex={0}
    >
      {tab.dirty ? (
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            active ? 'bg-primary-foreground' : 'bg-amber-500',
          )}
          aria-label="unsaved"
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {onClose ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={closeLabel}
          className={cn(
            'h-5 w-5 shrink-0 rounded opacity-60 hover:opacity-100',
            active
              ? 'text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground'
              : 'text-muted-foreground',
          )}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
