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
import { Archive, type LucideIcon, Pause, Play, Shuffle, Square, Trash2, X } from 'lucide-react';
import { useId, useState, useTransition } from 'react';

/* Dialog spec — each variant carries its own labels */

type DialogCommonLabels = {
  titleKey: string;
  descriptionKey: string;
  confirmKey: string;
  /** Optional spinner label key; falls back to confirmKey when absent. */
  pendingKey?: string;
  /** ICU params for description + confirmLabel + title (e.g. {slug: 'acme'}). */
  i18nParams?: Record<string, string | number>;
};

export type MutationDialogConfirm = DialogCommonLabels & {
  type: 'confirm';
  destructive?: boolean;
};

export type MutationDialogSlugConfirm = DialogCommonLabels & {
  type: 'slugConfirm';
  /** Label above the slug input (e.g. "Type {slug} to confirm"). */
  confirmLabelKey: string;
};

export type MutationDialogTextInput = DialogCommonLabels & {
  type: 'textInput';
  inputName: string;
  labelKey: string;
  placeholderKey?: string;
  required?: boolean;
  maxLength?: number;
};

export type MutationDialogSelect = DialogCommonLabels & {
  type: 'select';
  inputName: string;
  labelKey: string;
  placeholderKey?: string;
  emptyKey?: string;
  options: Array<{ value: string; label: string }>;
};

export type MutationDialogSpec =
  | MutationDialogConfirm
  | MutationDialogSlugConfirm
  | MutationDialogTextInput
  | MutationDialogSelect;

/* Mutation spec */

export type SaMutationSpec = {
  key: string;
  action: (formData: FormData) => Promise<void>;
  buttonLabelKey: string;
  buttonIcon: string;
  buttonVariant?: 'secondary' | 'destructive';
  /** When true, hide the button (e.g. suspend hidden when already suspended). */
  hideWhen?: boolean;
  hiddenFields?: Record<string, string>;
  dialog: MutationDialogSpec;
};

const ICONS: Record<string, LucideIcon> = {
  Archive,
  Pause,
  Play,
  Shuffle,
  Trash2,
  X,
};

export type SaMutationToolbarProps = {
  /**
   * i18n translator — caller resolves the namespace. Keys passed to the
   * toolbar are relative to that namespace.
   */
  t: (key: string, params?: Record<string, string | number>) => string;
  mutations: SaMutationSpec[];
  leading?: React.ReactNode;
  cancelLabelKey?: string;
};

/**
 * Generic mutation toolbar. Renders a row of action buttons, each opening
 * a dialog according to its spec. Replaces hand-rolled per-mutation useState
 * + useTransition + dialog boilerplate.
 *
 * Each mutation spec is self-contained: button labels, dialog labels,
 * hidden form fields, and the server action all colocated. Adding a new
 * mutation = appending one spec entry, no new useState/handler wiring.
 */
export function SaMutationToolbar({
  t,
  mutations,
  leading,
  cancelLabelKey = 'cancel',
}: SaMutationToolbarProps) {
  return (
    <div
      className="actionbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        marginTop: 14,
      }}
    >
      {leading ? <div>{leading}</div> : null}
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        {mutations
          .filter((m) => !m.hideWhen)
          .map((m) => (
            <MutationDialog key={m.key} spec={m} t={t} cancelLabelKey={cancelLabelKey} />
          ))}
      </div>
    </div>
  );
}

function MutationDialog({
  spec,
  t,
  cancelLabelKey,
}: {
  spec: SaMutationSpec;
  t: (key: string, params?: Record<string, string | number>) => string;
  cancelLabelKey: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  const Icon = ICONS[spec.buttonIcon] ?? Square;
  const slugConfirmValue =
    spec.dialog.type === 'slugConfirm' ? (spec.hiddenFields?.confirmSlug ?? '') : '';
  const requiredOk =
    spec.dialog.type === 'slugConfirm'
      ? typed === slugConfirmValue
      : spec.dialog.type === 'textInput'
        ? !spec.dialog.required || typed.trim().length > 0
        : spec.dialog.type === 'select'
          ? typed.length > 0
          : true;
  const confirmDisabled = isPending || !requiredOk;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        for (const [k, v] of Object.entries(spec.hiddenFields ?? {})) {
          fd.set(k, v);
        }
        if (spec.dialog.type === 'textInput' || spec.dialog.type === 'select') {
          fd.set(spec.dialog.inputName, typed);
        }
        await spec.action(fd);
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

  const confirmLabel = t(spec.dialog.confirmKey);
  const pendingLabel = spec.dialog.pendingKey ? t(spec.dialog.pendingKey) : confirmLabel;
  const isDestructiveAction =
    spec.buttonVariant === 'destructive' ||
    (spec.dialog.type === 'confirm' && spec.dialog.destructive);

  return (
    <AlertDialog open={open} onOpenChange={resetState}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant={spec.buttonVariant ?? 'secondary'}
            disabled={isPending}
          >
            <Icon size={14} strokeWidth={1.75} />
            <span>{t(spec.buttonLabelKey)}</span>
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(spec.dialog.titleKey, spec.dialog.i18nParams)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(spec.dialog.descriptionKey, spec.dialog.i18nParams)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {spec.dialog.type === 'slugConfirm' ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t(spec.dialog.confirmLabelKey, spec.dialog.i18nParams)}
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              disabled={isPending}
            />
          </div>
        ) : spec.dialog.type === 'textInput' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor={inputId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t(spec.dialog.labelKey)}
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={spec.dialog.placeholderKey ? t(spec.dialog.placeholderKey) : ''}
              maxLength={spec.dialog.maxLength ?? 1000}
              disabled={isPending}
              required={spec.dialog.required}
            />
          </div>
        ) : spec.dialog.type === 'select' ? (
          spec.dialog.options.length === 0 && spec.dialog.emptyKey ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t(spec.dialog.emptyKey)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={inputId} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t(spec.dialog.labelKey)}
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
                <option value="">
                  {spec.dialog.placeholderKey ? t(spec.dialog.placeholderKey) : '—'}
                </option>
                {spec.dialog.options.map((o) => (
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
          <AlertDialogCancel disabled={isPending}>{t(cancelLabelKey)}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (confirmDisabled) return;
              handleConfirm();
            }}
            disabled={confirmDisabled}
            className={cn(
              isDestructiveAction &&
                'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30',
            )}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
