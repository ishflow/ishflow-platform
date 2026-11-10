'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface AccountFormProps {
  action: (formData: FormData) => void | Promise<void>;
}

export function AccountForm({ action }: AccountFormProps) {
  const t = useTranslations('addons.bankImport.accounts');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData) => {
        setSubmitting(true);
        try {
          await action(formData);
          // The action revalidates the list; reset the inputs by re-rendering
          // via a hard form key bump would also work — but a simple reset is
          // simpler here.
          (document.getElementById('bank-account-form') as HTMLFormElement | null)?.reset();
        } finally {
          setSubmitting(false);
        }
      }}
      id="bank-account-form"
      className="grid gap-3 sm:grid-cols-2"
    >
      <div className="grid gap-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input id="name" name="name" required maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bankName">{t('bankName')}</Label>
        <Input id="bankName" name="bankName" maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="accountNo">{t('accountNo')}</Label>
        <Input id="accountNo" name="accountNo" required maxLength={40} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bic">{t('bic')}</Label>
        <Input id="bic" name="bic" maxLength={20} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="currency">{t('currency')}</Label>
        <Input id="currency" name="currency" defaultValue="RUB" maxLength={3} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? t('submitting') : t('create')}
        </Button>
      </div>
    </form>
  );
}
