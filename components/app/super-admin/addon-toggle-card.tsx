'use client';

import { disableAddon, enableAddon } from '@/app/super-admin/tenants/[tenantId]/addons/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import type { AddonKey, AddonStatus } from '@/platform/addons';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import { useState, useTransition } from 'react';

export interface AddonRowState {
  enabled: boolean;
  enabledAt: string | null;
  enabledByName: string | null;
  expiresAt: string | null;
  notes: string | null;
}

export interface AddonToggleCardProps {
  tenantId: string;
  addonKey: AddonKey;
  status: AddonStatus;
  title: string;
  description: string;
  row: AddonRowState;
  dict: SuperAdminDict['addons'];
}

function statusBadgeVariant(status: AddonStatus): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'ga':
      return 'default';
    case 'beta':
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function AddonToggleCard({
  tenantId,
  addonKey,
  status,
  title,
  description,
  row,
  dict,
}: AddonToggleCardProps) {
  const [enableOpen, setEnableOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium leading-none">{title}</h3>
            <Badge variant={statusBadgeVariant(status)}>{dict.statusLabels[status]}</Badge>
            {row.enabled ? (
              <Badge variant="default">{dict.enabledBadge}</Badge>
            ) : (
              <Badge variant="outline">{dict.disabledBadge}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {row.enabled ? (
            <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                {dict.disable}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{dict.disableConfirmTitle}</DialogTitle>
                  <DialogDescription>{dict.disableConfirmDescription}</DialogDescription>
                </DialogHeader>
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      await disableAddon(fd);
                      setDisableOpen(false);
                    });
                  }}
                >
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="addonKey" value={addonKey} />
                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDisableOpen(false)}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="destructive" disabled={pending}>
                      {pending ? dict.submitting : dict.disable}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={enableOpen} onOpenChange={setEnableOpen}>
              <DialogTrigger render={<Button size="sm" />}>{dict.enable}</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{dict.enableConfirmTitle}</DialogTitle>
                  <DialogDescription>{title}</DialogDescription>
                </DialogHeader>
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      await enableAddon(fd);
                      setEnableOpen(false);
                    });
                  }}
                  className="flex flex-col gap-3"
                >
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="addonKey" value={addonKey} />
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`expires-${addonKey}`}>{dict.expiresAtLabel}</Label>
                    <Input id={`expires-${addonKey}`} name="expiresAt" type="date" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`notes-${addonKey}`}>{dict.notesLabel}</Label>
                    <Textarea
                      id={`notes-${addonKey}`}
                      name="notes"
                      rows={2}
                      placeholder={dict.notesPlaceholder}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEnableOpen(false)}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={pending}>
                      {pending ? dict.submitting : dict.enable}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {row.enabled ? (
        <footer className="flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground">
          {row.enabledAt ? (
            <span>
              {dict.enabledOn.replace('{date}', formatDate(row.enabledAt))}{' '}
              {row.enabledByName ? dict.enabledBy.replace('{actor}', row.enabledByName) : null}
            </span>
          ) : null}
          <span>
            {row.expiresAt
              ? dict.expiresAt.replace('{date}', formatDate(row.expiresAt))
              : dict.expiresNever}
          </span>
          {row.notes ? <span className="italic">"{row.notes}"</span> : null}
        </footer>
      ) : null}
    </article>
  );
}
