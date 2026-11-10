'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/platform/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect } from 'react';
import { type CompleteProfileResult, completeProfileAction } from './actions';

const initialState: CompleteProfileResult | null = null;

export function ProfileForm({
  defaultFirstName,
  defaultLastName,
}: {
  defaultFirstName: string;
  defaultLastName: string;
}) {
  const t = useTranslations('invite.profile');
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CompleteProfileResult | null, FormData>(
    async (_prev, formData) => completeProfileAction(formData),
    initialState,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push('/invite/done');
    }
  }, [state, router]);

  const error = state && !state.ok ? state.error : undefined;

  return (
    <form action={formAction} className="grid w-full max-w-sm gap-4">
      <div className="grid gap-2">
        <Label htmlFor="firstName">{t('firstName')}</Label>
        <Input
          id="firstName"
          name="firstName"
          defaultValue={defaultFirstName}
          required
          maxLength={120}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lastName">{t('lastName')}</Label>
        <Input
          id="lastName"
          name="lastName"
          defaultValue={defaultLastName}
          required
          maxLength={120}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">{t('phone')}</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={20} />
      </div>
      {error ? <p className="text-sm text-destructive">{t(`errors.${error}`)}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
