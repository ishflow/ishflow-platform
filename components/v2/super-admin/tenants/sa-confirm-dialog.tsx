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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { type ReactElement, type ReactNode, useId, useState, useTransition } from 'react';

export interface SaConfirmDialogProps {
  trigger: ReactElement;
  title: string;
  description?: ReactNode;
  /**
   * If set, the user must type this exact string to enable the confirm
   * button. Used for destructive mutations (delete tenant, etc.).
   */
  requiredText?: string;
  requiredTextLabel?: string;
  destructive?: boolean;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel?: string;
  onConfirm: () => Promise<void>;
}

export function SaConfirmDialog({
  trigger,
  title,
  description,
  requiredText,
  requiredTextLabel,
  destructive,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  onConfirm,
}: SaConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  const confirmDisabled = isPending || (requiredText !== undefined && typed !== requiredText);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
        setTyped('');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTyped('');
          setError(null);
        }
        setOpen(next);
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>

        {requiredText !== undefined ? (
          <div className="flex flex-col gap-2">
            {requiredTextLabel ? <Label htmlFor={inputId}>{requiredTextLabel}</Label> : null}
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              disabled={isPending}
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (confirmDisabled) return;
              handleConfirm();
            }}
            disabled={confirmDisabled}
            className={cn(
              destructive &&
                'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30',
            )}
          >
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
