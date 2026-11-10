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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ReadonlyFormProps {
  current: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
  labels: {
    title: string;
    description: string;
    currentlyEnabled: string;
    currentlyDisabled: string;
    toggleLabel: string;
    save: string;
    confirmTitle: string;
    confirmBody: string;
    confirmDisableTitle: string;
    confirmDisableBody: string;
    confirmYes: string;
    confirmCancel: string;
  };
}

export function ReadonlyForm({ current, onSubmit, labels }: ReadonlyFormProps) {
  const [enabled, setEnabled] = useState(current);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stateChange = enabled !== current;
  const enablingNow = stateChange && enabled;

  function submit() {
    const fd = new FormData();
    if (enabled) fd.set('enabled', 'on');
    startTransition(async () => {
      await onSubmit(fd);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Badge variant={current ? 'destructive' : 'outline'}>
          {current ? labels.currentlyEnabled : labels.currentlyDisabled}
        </Badge>
        <div className="flex items-center gap-3">
          <Switch
            id="readonly-enabled"
            checked={enabled}
            onCheckedChange={(v) => setEnabled(Boolean(v))}
          />
          <Label htmlFor="readonly-enabled">{labels.toggleLabel}</Label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          type="button"
          onClick={() => (stateChange ? setConfirmOpen(true) : submit())}
          disabled={pending}
        >
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
    </Card>
  );
}
