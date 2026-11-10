'use client';

import {
  type CreateSupportTicketState,
  createSupportTicket,
} from '@/app/[locale]/(app)/support/_actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, LifeBuoy, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton({ label, pending }: { label: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <Button type="submit" disabled={isPending} className="gap-2">
      <Send className="size-4" strokeWidth={1.75} />
      {isPending ? pending : label}
    </Button>
  );
}

export function V2SupportForm() {
  const t = useTranslations('v2_support');
  const [state, formAction] = useActionState<CreateSupportTicketState, FormData>(
    createSupportTicket,
    null,
  );

  if (state?.ok) {
    return (
      <Card className="max-w-2xl bg-background text-foreground">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-foreground" strokeWidth={1.5} />
          <CardTitle>{t('success.title')}</CardTitle>
          <CardDescription className="max-w-md text-muted-foreground">
            {t('success.body')}
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl bg-background text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="size-5 text-muted-foreground" strokeWidth={1.75} />
          {t('form.title')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">{t('form.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="support-subject">{t('form.subjectLabel')}</Label>
            <Input
              id="support-subject"
              name="subject"
              required
              maxLength={200}
              placeholder={t('form.subjectPlaceholder')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="support-body">{t('form.bodyLabel')}</Label>
            <Textarea
              id="support-body"
              name="body"
              required
              maxLength={5000}
              rows={8}
              placeholder={t('form.bodyPlaceholder')}
            />
          </div>

          {state && !state.ok ? (
            <p className="text-sm text-muted-foreground" role="alert">
              {state.error === 'invalid'
                ? t('error.invalid')
                : state.error === 'unauthenticated'
                  ? t('error.unauthenticated')
                  : t('error.unknown')}
            </p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton label={t('form.submit')} pending={t('form.submitting')} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
