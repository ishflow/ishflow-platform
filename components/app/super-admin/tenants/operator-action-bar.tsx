'use client';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import type { TenantProDict } from '@/platform/super-admin/tenants/dict';
import type { TenantStatus } from '@prisma/client';
import { useState, useTransition } from 'react';

type ActionKind = 'suspend' | 'lift' | 'archive' | 'restore' | 'hardDelete' | 'transfer' | 'wipe';

interface Props {
  tenantId: string;
  tenantSlug: string;
  tenantStatus: TenantStatus;
  isArchived: boolean;
  dict: TenantProDict['actionBar'];
  actions: {
    suspend: (formData: FormData) => Promise<void>;
    lift: (formData: FormData) => Promise<void>;
    archive: (formData: FormData) => Promise<void>;
    restore: (formData: FormData) => Promise<void>;
    hardDelete: (formData: FormData) => Promise<void>;
    transfer: (formData: FormData) => Promise<void>;
    wipe: (formData: FormData) => Promise<void>;
  };
}

export function OperatorActionBar({
  tenantId,
  tenantSlug,
  tenantStatus,
  isArchived,
  dict,
  actions,
}: Props) {
  const [open, setOpen] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState('');
  const [slug, setSlug] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(null);
    setReason('');
    setSlug('');
    setNewOwner('');
    setError(null);
  }

  function submit(action: (form: FormData) => Promise<void>, extras: Record<string, string>) {
    const form = new FormData();
    form.set('tenantId', tenantId);
    for (const [k, v] of Object.entries(extras)) form.set(k, v);
    setError(null);
    startTransition(async () => {
      try {
        await action(form);
        close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    });
  }

  const isSuspended = tenantStatus === 'suspended';
  const slugOk = slug === tenantSlug;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{dict.title}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {isSuspended && <Badge variant="destructive">{dict.suspendedBadge}</Badge>}
          {isArchived && <Badge variant="outline">{dict.archivedBadge}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {!isSuspended ? (
          <Button variant="outline" size="sm" onClick={() => setOpen('suspend')}>
            {dict.suspend}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setOpen('lift')}>
            {dict.liftSuspension}
          </Button>
        )}
        {!isArchived ? (
          <Button variant="outline" size="sm" onClick={() => setOpen('archive')}>
            {dict.archive}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setOpen('restore')}>
            {dict.restore}
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={() => setOpen('hardDelete')}>
          {dict.hardDelete}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen('transfer')}>
          {dict.transfer}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setOpen('wipe')}>
          {dict.wipe}
        </Button>
        <a
          href={`/super-admin/tenants/${tenantId}/export`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {dict.exportJson}
        </a>
      </CardContent>

      {/* suspend */}
      <Dialog open={open === 'suspend'} onOpenChange={(v) => (!v ? close() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.suspendTitle}</DialogTitle>
            <DialogDescription>{dict.suspendDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="op-reason">{dict.reasonLabel}</Label>
            <Textarea
              id="op-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={dict.reasonPlaceholder}
              rows={3}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {dict.cancel}
            </Button>
            <Button
              onClick={() => submit(actions.suspend, { reason })}
              disabled={isPending || !reason.trim()}
            >
              {dict.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* lift */}
      <Dialog open={open === 'lift'} onOpenChange={(v) => (!v ? close() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.liftTitle}</DialogTitle>
            <DialogDescription>{dict.liftDescription}</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {dict.cancel}
            </Button>
            <Button onClick={() => submit(actions.lift, {})} disabled={isPending}>
              {dict.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* archive */}
      <Dialog open={open === 'archive'} onOpenChange={(v) => (!v ? close() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.archiveTitle}</DialogTitle>
            <DialogDescription>{dict.archiveDescription}</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {dict.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => submit(actions.archive, {})}
              disabled={isPending}
            >
              {dict.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* restore */}
      <Dialog open={open === 'restore'} onOpenChange={(v) => (!v ? close() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.restoreTitle}</DialogTitle>
            <DialogDescription>{dict.restoreDescription}</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {dict.cancel}
            </Button>
            <Button onClick={() => submit(actions.restore, {})} disabled={isPending}>
              {dict.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* hard delete */}
      <Dialog open={open === 'hardDelete'} onOpenChange={(v) => (!v ? close() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.hardDeleteTitle}</DialogTitle>
            <DialogDescription>{dict.hardDeleteDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="op-slug">{dict.slugLabel}</Label>
            <Input
              id="op-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={tenantSlug}
              autoComplete="off"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">{dict.slugDescription}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {dict.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                submit(actions.hardDelete, {
                  confirmSlug: slug,
                  bypassWindow: isArchived ? '' : '1',
                })
              }
              disabled={isPending || !slugOk}
            >
              {dict.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* transfer */}
      <Dialog open={open === 'transfer'} onOpenChange={(v) => (!v ? close() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.transferTitle}</DialogTitle>
            <DialogDescription>{dict.transferDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="op-owner">{dict.newOwnerLabel}</Label>
            <Input
              id="op-owner"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              placeholder={dict.newOwnerPlaceholder}
              autoComplete="off"
              className="font-mono text-xs"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {dict.cancel}
            </Button>
            <Button
              onClick={() => submit(actions.transfer, { newOwnerUserId: newOwner.trim() })}
              disabled={isPending || !newOwner.trim()}
            >
              {dict.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* wipe */}
      <Dialog open={open === 'wipe'} onOpenChange={(v) => (!v ? close() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.wipeTitle}</DialogTitle>
            <DialogDescription>{dict.wipeDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="op-wipe-slug">{dict.slugLabel}</Label>
            <Input
              id="op-wipe-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={tenantSlug}
              autoComplete="off"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">{dict.slugDescription}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {dict.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => submit(actions.wipe, { confirmSlug: slug })}
              disabled={isPending || !slugOk}
            >
              {dict.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
