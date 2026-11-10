'use client';

import { cloneDocumentRecord } from '@/app/[locale]/(app)/documents/[entity]/actions';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

type Props = {
  locale: string;
  entity: string;
  id: string;
};

export function CloneDocumentButton({ locale, entity, id }: Props) {
  const t = useTranslations('document');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const promise = cloneDocumentRecord(locale, entity, id);
          toast.promise(promise, {
            loading: t('cloneAction.loading'),
            success: t('cloneAction.success'),
            error: t('cloneAction.error'),
          });
          const result = await promise;
          if (result.ok && 'redirectTo' in result && typeof result.redirectTo === 'string') {
            router.push(result.redirectTo);
          }
        });
      }}
    >
      <Copy className="mr-2 h-4 w-4" />
      {t('clone')}
    </Button>
  );
}
