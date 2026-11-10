'use client';

import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/platform/ui';
import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

interface Props {
  invoiceId: string;
  action: (invoiceId: string) => Promise<ActionResult>;
}

export function InvoiceSendEmailButton({ invoiceId, action }: Props) {
  const t = useTranslations('notifications.invoiceButton');
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await action(invoiceId);
      if (result.ok) {
        toast.success(t('sentToast'));
      } else {
        toast.error(t('errorToast', { error: result.formError ?? 'unknown' }));
      }
    });
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={pending}>
      <Mail className="mr-2 h-4 w-4" />
      {pending ? t('sending') : t('label')}
    </Button>
  );
}
