'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionResult } from '@/platform/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

type Props = {
  tenantName: string;
  canDelete: boolean;
  leaveAction: () => Promise<ActionResult>;
  deleteAction: (typedName: string) => Promise<ActionResult>;
};

export function DangerZoneCard({ tenantName, canDelete, leaveAction, deleteAction }: Props) {
  const t = useTranslations('settings.danger');
  const router = useRouter();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [pending, startTransition] = useTransition();

  const confirmLeave = () => {
    startTransition(async () => {
      const result = await leaveAction();
      if (result.ok) {
        toast.success(t('leftToast', { tenantName }));
        setLeaveOpen(false);
        router.push(result.redirectTo ?? '/dashboard');
      } else if (result.formError === 'soleOwner') {
        toast.error(t('leaveSoleOwnerError'));
      } else {
        toast.error(result.formError ?? 'error');
      }
    });
  };

  const confirmDelete = () => {
    if (typedName !== tenantName) {
      toast.error(t('deleteNameMismatch'));
      return;
    }
    startTransition(async () => {
      const result = await deleteAction(typedName);
      if (result.ok) {
        toast.success(t('deletedToast'));
        setDeleteOpen(false);
        router.push(result.redirectTo ?? '/sign-in');
      } else if (result.formError === 'nameMismatch') {
        toast.error(t('deleteNameMismatch'));
      } else {
        toast.error(result.formError ?? 'error');
      }
    });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">{t('leaveTitle')}</CardTitle>
          <CardDescription>{t('leaveBody', { tenantName })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setLeaveOpen(true)} disabled={pending}>
            {t('leaveBtn')}
          </Button>
        </CardContent>
      </Card>

      {canDelete && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t('deleteTitle')}</CardTitle>
            <CardDescription>{t('deleteBody')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={pending}>
              {t('deleteBtn')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('leaveConfirmTitle', { tenantName })}</DialogTitle>
            <DialogDescription>{t('leaveConfirmBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)} disabled={pending}>
              {t('leaveBtn')}
            </Button>
            <Button variant="destructive" onClick={confirmLeave} disabled={pending}>
              {t('leaveConfirmCta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>{t('deleteBody')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="org-delete-confirm">
              {t('deleteConfirmPlaceholder', { tenantName })}
            </Label>
            <Input
              id="org-delete-confirm"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={tenantName}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={pending}>
              {t('leaveBtn')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending || typedName !== tenantName}
            >
              {t('deleteBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
