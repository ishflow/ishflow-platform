'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function OwnerlessBanner() {
  const t = useTranslations('admin.members');

  async function handleRecover() {
    const res = await fetch('/api/admin/tenant/recover-ownership', {
      method: 'POST',
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const body = await res.text();
      window.alert(`${t('recoverOwnershipFailed')}: ${body}`);
    }
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>{t('recoverOwnershipTitle')}</AlertTitle>
      <AlertDescription className="flex items-center gap-4">
        {t('recoverOwnership')}
        <Button variant="outline" size="sm" onClick={handleRecover}>
          {t('recoverOwnershipCta')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
