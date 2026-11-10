'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ScopeOperator } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export type ScopeDraft = {
  entityId: string;
  field: string;
  operator: ScopeOperator;
  value: string;
};

type ScopeEditorProps = {
  entityOptions: string[];
  onAdd: (draft: ScopeDraft) => void;
  triggerLabel: string;
};

export function ScopeEditor({ entityOptions, onAdd, triggerLabel }: ScopeEditorProps) {
  const t = useTranslations('admin.roles.scope');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ScopeDraft>({
    entityId: '',
    field: '',
    operator: 'equals',
    value: '',
  });

  function submit() {
    if (!draft.entityId || !draft.field) return;
    onAdd(draft);
    setOpen(false);
    setDraft({ entityId: '', field: '', operator: 'equals', value: '' });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">{triggerLabel}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Entity</Label>
            <Select
              value={draft.entityId}
              onValueChange={(v) => setDraft({ ...draft, entityId: v ?? '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick entity" />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Field</Label>
            <Input
              value={draft.field}
              onChange={(e) => setDraft({ ...draft, field: e.target.value })}
              placeholder="e.g. warehouseId"
            />
          </div>
          <div>
            <Label>Operator</Label>
            <Select
              value={draft.operator}
              onValueChange={(v) =>
                setDraft({ ...draft, operator: (v ?? 'equals') as ScopeDraft['operator'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">{t('operator.equals')}</SelectItem>
                <SelectItem value="in_">{t('operator.in_')}</SelectItem>
                <SelectItem value="contextEquals">{t('operator.contextEquals')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              placeholder={
                draft.operator === 'in_'
                  ? 'a,b,c'
                  : draft.operator === 'contextEquals'
                    ? '$context.userId'
                    : 'literal'
              }
            />
          </div>
          <Button onClick={submit}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function parseScopeValue(draft: ScopeDraft): unknown {
  if (draft.operator === 'in_') {
    return draft.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return draft.value;
}
