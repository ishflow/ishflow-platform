'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Archive,
  CheckCircle2,
  type LucideIcon,
  Pause,
  Pencil,
  Play,
  Shuffle,
  Square,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useId, useState, useTransition } from 'react';

const ICONS: Record<string, LucideIcon> = {
  Archive,
  CheckCircle2,
  Pause,
  Pencil,
  Play,
  Shuffle,
  Trash2,
  UserPlus,
  X,
};

/* Pre-resolved per-row action specs hand off from the server to the client.
 * Each entry is a slim version of SaCatalogRowAction with:
 *  - i18n labels already resolved to strings
 *  - hidden form fields already extracted from the row (so the client
 *    component is pure presentation + dialog state).
 */
export type ResolvedRowAction = {
  key: string;
  label: string;
  icon: string;
  variant?: 'secondary' | 'destructive';
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  dialog: {
    type: 'confirm' | 'slugConfirm' | 'textInput' | 'select';
    title: string;
    description: string;
    confirmLabel: string;
    pendingLabel: string;
    destructive?: boolean;
    /** When type === 'slugConfirm', the value the input must match. */
    slugMatch?: string;
    /** Required-text label for slugConfirm. */
    confirmTextLabel?: string;
    /** Field name added to FormData for textInput/select dialogs. */
    inputName?: string;
    inputLabel?: string;
    placeholder?: string;
    required?: boolean;
    maxLength?: number;
    options?: Array<{ value: string; label: string }>;
    emptyLabel?: string;
  };
  cancelLabel: string;
};

/**
 * Inline button + AlertDialog for a single row action. Wired by the list
 * shell from `cfg.list.rowActions`. Per-row visibility filtering happens on
 * the server before this client component is reached.
 */
export function SaRowActionButton({ action }: { action: ResolvedRowAction }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  const Icon = ICONS[action.icon] ?? Square;

  const requiredOk =
    action.dialog.type === 'slugConfirm'
      ? typed === (action.dialog.slugMatch ?? '')
      : action.dialog.type === 'textInput'
        ? !action.dialog.required || typed.trim().length > 0
        : action.dialog.type === 'select'
          ? typed.length > 0
          : true;
  const confirmDisabled = isPending || !requiredOk;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        for (const [k, v] of Object.entries(action.hiddenFields)) {
          fd.set(k, v);
        }
        if (
          (action.dialog.type === 'textInput' || action.dialog.type === 'select') &&
          action.dialog.inputName
        ) {
          fd.set(action.dialog.inputName, typed);
        }
        await action.action(fd);
        setOpen(false);
        setTyped('');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function resetState(next: boolean) {
    if (!next) {
      setTyped('');
      setError(null);
    }
    setOpen(next);
  }

  const isDestructive =
    action.variant === 'destructive' ||
    (action.dialog.type === 'confirm' && action.dialog.destructive);

  return (
    <AlertDialog open={open} onOpenChange={resetState}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant={action.variant ?? 'secondary'}
            disabled={isPending}
          >
            <Icon size={12} strokeWidth={1.75} />
            <span>{action.label}</span>
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action.dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{action.dialog.description}</AlertDialogDescription>
        </AlertDialogHeader>

        {action.dialog.type === 'slugConfirm' && action.dialog.confirmTextLabel ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {action.dialog.confirmTextLabel}
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              disabled={isPending}
            />
          </div>
        ) : action.dialog.type === 'textInput' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor={inputId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {action.dialog.inputLabel ?? ''}
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={action.dialog.placeholder ?? ''}
              maxLength={action.dialog.maxLength ?? 1000}
              disabled={isPending}
              required={action.dialog.required}
            />
          </div>
        ) : action.dialog.type === 'select' ? (
          (action.dialog.options?.length ?? 0) === 0 && action.dialog.emptyLabel ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{action.dialog.emptyLabel}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={inputId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {action.dialog.inputLabel ?? ''}
              </label>
              <select
                id={inputId}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={isPending}
                style={{
                  padding: '8px 10px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <option value="">{action.dialog.placeholder ?? '—'}</option>
                {(action.dialog.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )
        ) : null}

        {error ? <p style={{ color: 'var(--destructive)', fontSize: 12.5 }}>{error}</p> : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{action.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (confirmDisabled) return;
              handleConfirm();
            }}
            disabled={confirmDisabled}
            className={cn(
              isDestructive &&
                'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30',
            )}
          >
            {isPending ? action.dialog.pendingLabel : action.dialog.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Cell wrapper rendering one button per resolved action.
 */
export function SaRowActionsCell({ actions }: { actions: ResolvedRowAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
      {actions.map((a) => (
        <SaRowActionButton key={a.key} action={a} />
      ))}
    </div>
  );
}
