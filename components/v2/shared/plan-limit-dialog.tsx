'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/**
 * True when a form-action error string is a plan-limit block. Tolerates both
 * key shapes server actions emit today: `planLimit.<kind>` (documents) and
 * `plan_limit.<kind>` (member invites). Use this everywhere a form decides
 * whether to swap its red inline error for the branded dialog.
 */
export function isPlanLimitError(err: string | null | undefined): boolean {
  return typeof err === 'string' && (err.startsWith('planLimit.') || err.startsWith('plan_limit.'));
}

/**
 * Branded, centered modal shown when a create/post action is blocked by the
 * tenant's plan limit. Replaces the raw red inline error so end-users get a
 * clear, on-brand message and a single dismiss action.
 *
 * `token` should be the form's action-state reference — a new object on every
 * submission — so the dialog re-opens each time the limit is hit again, even
 * for the same error key (which would otherwise stay dismissed).
 */
export function PlanLimitDialog({ token }: { token: unknown }) {
  const t = useTranslations('v2_marketing.errors.planLimit');
  const [open, setOpen] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-open on each new submission token, not on setOpen identity.
  useEffect(() => {
    setOpen(true);
  }, [token]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader className="items-center text-center">
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 text-primary ring-1 ring-primary/15">
            <Rocket size={22} strokeWidth={1.75} />
          </div>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={() => setOpen(false)}>{t('ok')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
