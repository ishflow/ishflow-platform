'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import { LEAD_STATUSES, type LeadStatus } from '@/platform/super-admin/marketing';
import { useTransition } from 'react';

import { updateLeadStatusAction } from '@/app/super-admin/marketing/_actions/leads';

interface Props {
  id: string;
  current: string;
  dict: SuperAdminDict['marketing']['leads'];
  /** Override the server action (V2 CMS passes its own). Defaults to the locale-free action. */
  action?: (formData: FormData) => Promise<void>;
}

export function LeadStatusSelect({ id, current, dict, action = updateLeadStatusAction }: Props) {
  const [isPending, startTransition] = useTransition();

  const onChange = (value: string | null) => {
    if (!value || value === current) return;
    const fd = new FormData();
    fd.append('id', id);
    fd.append('status', value);
    startTransition(async () => {
      await action(fd);
    });
  };

  return (
    <Select value={current} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger size="sm" className="h-8 w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {dict.statusLabels[status as LeadStatus]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
