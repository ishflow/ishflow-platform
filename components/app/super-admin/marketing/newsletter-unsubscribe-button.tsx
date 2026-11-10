'use client';

import { Button } from '@/components/ui/button';
import { useTransition } from 'react';

import { unsubscribeNewsletterAction } from '@/app/super-admin/marketing/_actions/newsletter';

interface Props {
  id: string;
  label: string;
  confirm: string;
  /** Override the server action (V2 CMS passes its own). Defaults to the locale-free action. */
  action?: (formData: FormData) => Promise<void>;
}

export function NewsletterUnsubscribeButton({
  id,
  label,
  confirm,
  action = unsubscribeNewsletterAction,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!window.confirm(confirm)) return;
    const fd = new FormData();
    fd.append('id', id);
    startTransition(async () => {
      await action(fd);
    });
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={isPending}>
      {label}
    </Button>
  );
}
