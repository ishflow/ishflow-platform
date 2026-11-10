'use client';

import { Button } from '@/components/ui/button';
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
import { useState, useTransition } from 'react';

type TransferOwnershipModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetEmail: string;
  targetName: string;
  onConfirm: () => void;
  disabled?: boolean;
  confirmLabel: string;
  descriptionLabel: string;
};

export function TransferOwnershipModal({
  open,
  onOpenChange,
  targetEmail,
  targetName,
  onConfirm,
  disabled,
  confirmLabel,
  descriptionLabel,
}: TransferOwnershipModalProps) {
  const [confirmation, setConfirmation] = useState('');
  const [isPending, startTransition] = useTransition();

  const canConfirm = confirmation === 'TRANSFER';

  function handleConfirm() {
    if (!canConfirm) return;
    startTransition(() => {
      onConfirm();
      setConfirmation('');
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>
            {descriptionLabel.replace('{name}', targetName)} ({targetEmail})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transfer-confirm">{confirmLabel}</Label>
            <Input
              id="transfer-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="TRANSFER"
              disabled={isPending || disabled}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || isPending || disabled}>
            {isPending ? 'Transferring...' : 'Transfer ownership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
