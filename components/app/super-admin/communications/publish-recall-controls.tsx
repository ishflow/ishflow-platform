'use client';

import type { AnnouncementStatus } from '@prisma/client';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import type { SuperAdminDict } from '@/platform/super-admin/dict';

interface Props {
  status: AnnouncementStatus;
  publishAction: () => Promise<void>;
  recallAction: () => Promise<void>;
  dict: SuperAdminDict;
}

export function PublishRecallControls({ status, publishAction, recallAction, dict }: Props) {
  const t = dict.communications;
  const [pending, startTransition] = useTransition();
  const isLive = status === 'live';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending || isLive}
        onClick={() => startTransition(() => publishAction())}
      >
        {pending ? dict.common.applying : t.actions.publish}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || !isLive}
        onClick={() => startTransition(() => recallAction())}
      >
        {t.actions.recall}
      </Button>
    </div>
  );
}
