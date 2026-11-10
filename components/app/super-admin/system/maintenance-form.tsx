'use client';

import { useState, useTransition } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface MaintenanceFormProps {
  current: { enabled: boolean; until: string | null; message: string | null };
  onSubmit: (formData: FormData) => Promise<void>;
  labels: {
    title: string;
    description: string;
    currentlyEnabled: string;
    currentlyDisabled: string;
    toggleLabel: string;
    untilLabel: string;
    messageLabel: string;
    save: string;
    confirmTitle: string;
    confirmBody: string;
    confirmDisableTitle: string;
    confirmDisableBody: string;
    confirmYes: string;
    confirmCancel: string;
  };
}

export function MaintenanceForm({ current, onSubmit, labels }: MaintenanceFormProps) {
  const [enabled, setEnabled] = useState(current.enabled);
  const [until, setUntil] = useState(current.until ?? '');
  const [message, setMessage] = useState(current.message ?? '');
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stateChange = enabled !== current.enabled;
  const enablingNow = stateChange && enabled;
  const disablingNow = stateChange && !enabled;

  function submit() {
    const fd = new FormData();
    if (enabled) fd.set('enabled', 'on');
    fd.set('until', until);
    fd.set('message', message);
    startTransition(async () => {
      await onSubmit(fd);
    });
  }

  function handleSave() {
    if (stateChange) {
      setConfirmOpen(true);
      return;
    }
    submit();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Badge variant={current.enabled ? 'destructive' : 'outline'}>
          {current.enabled ? labels.currentlyEnabled : labels.currentlyDisabled}
        </Badge>
        <div className="flex items-center gap-3">
          <Switch
            id="maintenance-enabled"
            checked={enabled}
            onCheckedChange={(v) => setEnabled(Boolean(v))}
          />
          <Label htmlFor="maintenance-enabled">{labels.toggleLabel}</Label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maintenance-until">{labels.untilLabel}</Label>
          <Input
            id="maintenance-until"
            name="until"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            placeholder="2026-05-13T18:00:00Z"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maintenance-message">{labels.messageLabel}</Label>
          <Textarea
            id="maintenance-message"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {labels.save}
        </Button>
      </CardFooter>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {enablingNow ? labels.confirmTitle : labels.confirmDisableTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {enablingNow ? labels.confirmBody : labels.confirmDisableBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{labels.confirmCancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                setConfirmOpen(false);
                submit();
              }}
            >
              {labels.confirmYes}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Avoid unused-warning when disabling-only path */}
      {disablingNow ? null : null}
    </Card>
  );
}
