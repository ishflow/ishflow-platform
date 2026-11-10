'use client';

import { cancelInvitationAction } from '@/app/[locale]/(app)/admin/members/actions';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

type Props = {
  invitationId: string;
  email: string;
  systemRole: string;
  invitedAt: Date;
  invitedByName: string | null;
};

export function PendingInviteRow({
  invitationId,
  email,
  systemRole,
  invitedAt,
  invitedByName,
}: Props) {
  const t = useTranslations('admin.members');
  const tRole = useTranslations('roleLabels');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleLabel = ((): string => {
    try {
      return tRole(systemRole as Parameters<typeof tRole>[0]);
    } catch {
      return systemRole;
    }
  })();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await cancelInvitationAction(invitationId);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-muted-foreground">
      <div className="min-w-0 flex-1">
        <span className="italic text-foreground/80">{email}</span>
      </div>
      <Badge variant="secondary">{roleLabel}</Badge>
      <div className="flex flex-col items-end text-xs sm:flex-row sm:items-center sm:gap-3">
        <span>
          <span className="mr-1">{t('invitedAt')}</span>
          <time dateTime={invitedAt.toISOString()}>{format.relativeTime(invitedAt)}</time>
        </span>
        <span>
          <span className="mr-1">{t('invitedBy')}</span>
          <span>{invitedByName ?? '—'}</span>
        </span>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button variant="ghost" size="sm" disabled={isPending}>
              {t('cancelInvite')}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cancelConfirmBody', { email })}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t('cancelConfirmDismiss')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending ? t('cancelConfirmPending') : t('cancelConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
