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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SuperAdminProDict } from '@/platform/super-admin/pro-messages';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

interface UserActionsCardProps {
  dict: SuperAdminProDict['users']['detail']['actions'];
  cancelLabel: string;
  applyingLabel: string;
  passwordResetAction: () => Promise<{ ok: boolean; url?: string; message?: string }>;
  softDeleteAction: () => Promise<{ ok: boolean; message?: string }>;
  alreadyDeleted: boolean;
}

export function UserActionsCard({
  dict,
  cancelLabel,
  applyingLabel,
  passwordResetAction,
  softDeleteAction,
  alreadyDeleted,
}: UserActionsCardProps) {
  const [pending, startTransition] = useTransition();
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handlePasswordReset = () => {
    startTransition(async () => {
      const res = await passwordResetAction();
      if (res.ok) {
        setResetUrl(res.url ?? null);
        toast.success(dict.passwordResetSuccess);
      } else {
        toast.error(res.message ?? 'error');
      }
    });
  };

  const handleSoftDelete = () => {
    startTransition(async () => {
      const res = await softDeleteAction();
      if (res.ok) {
        toast.success(dict.softDeleteSuccess);
        setDeleteOpen(false);
      } else {
        toast.error(res.message ?? 'error');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handlePasswordReset}
              disabled={pending || alreadyDeleted}
            >
              {pending ? applyingLabel : dict.passwordReset}
            </Button>
            <p className="text-xs text-muted-foreground">{dict.passwordResetHint}</p>
          </div>
          {resetUrl ? (
            <div className="rounded-md border border-dashed bg-muted p-3">
              <p className="font-mono text-xs break-all text-foreground">{resetUrl}</p>
            </div>
          ) : null}
        </div>

        <Dialog
          open={deleteOpen}
          onOpenChange={(o) => {
            setDeleteOpen(o);
            if (!o) setDeleteConfirmText('');
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <DialogTrigger
              disabled={pending || alreadyDeleted}
              render={<Button type="button" variant="destructive" />}
            >
              {dict.softDelete}
            </DialogTrigger>
            <p className="text-xs text-muted-foreground">{dict.softDeleteHint}</p>
          </div>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dict.confirmTitle}</DialogTitle>
              <DialogDescription>{dict.softDeleteConfirm}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="soft-delete-confirm">DELETE</Label>
              <Input
                id="soft-delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={pending}>
                {cancelLabel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleSoftDelete}
                disabled={pending || deleteConfirmText.trim() !== 'DELETE'}
              >
                {pending ? applyingLabel : dict.softDelete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
