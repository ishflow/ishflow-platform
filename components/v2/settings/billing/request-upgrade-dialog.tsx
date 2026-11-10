'use client';

import {
  type RequestUpgradeState,
  requestUpgrade,
} from '@/app/[locale]/(app)/settings/billing/_actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { ArrowUpCircle, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton({ label, pending }: { label: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? pending : label}
    </Button>
  );
}

export function RequestUpgradeDialog({
  companyName,
  contactEmail,
  triggerClassName,
  triggerLabel,
  defaultPlan,
}: {
  companyName: string;
  contactEmail: string;
  triggerClassName?: string;
  triggerLabel: string;
  /** Pre-selected target plan (from a plan tile). Optional for the generic entry. */
  defaultPlan?: string;
}) {
  const t = useTranslations('v2_settings.billing.requestUpgrade');
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<RequestUpgradeState, FormData>(requestUpgrade, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button type="button" className={triggerClassName}>
            <ArrowUpCircle size={16} strokeWidth={1.75} />
            {triggerLabel}
          </button>
        }
      />
      <DialogContent className="bg-background text-foreground">
        {state?.ok ? (
          <>
            {/* Success — the form header ("leave your phone number") would be
                contradictory here, so we render a clean confirmation instead.
                A visually-hidden DialogTitle keeps the dialog accessible. */}
            <DialogHeader className="sr-only">
              <DialogTitle>{t('successTitle')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-7 text-primary" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-lg font-semibold">{t('successTitle')}</p>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {t('successBody')}
                </p>
              </div>
              <Button className="mt-2 min-w-28" onClick={() => setOpen(false)}>
                {t('close')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('subtitle')}
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ur-company">{t('companyLabel')}</Label>
                <Input id="ur-company" value={companyName} readOnly disabled />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ur-email">{t('emailLabel')}</Label>
                <Input id="ur-email" value={contactEmail} readOnly disabled />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ur-phone">{t('phoneLabel')}</Label>
                <Input
                  id="ur-phone"
                  name="contactPhone"
                  type="tel"
                  required
                  maxLength={40}
                  placeholder={t('phonePlaceholder')}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ur-plan">{t('planLabel')}</Label>
                <Select name="requestedPlan" defaultValue={defaultPlan}>
                  <SelectTrigger id="ur-plan">
                    <SelectValue placeholder={t('planPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ur-note">{t('noteLabel')}</Label>
                <Textarea id="ur-note" name="note" maxLength={1000} rows={3} />
              </div>

              {state && !state.ok ? (
                <p className="text-sm text-muted-foreground" role="alert">
                  {state.error === 'unauthenticated' ? t('errorAuth') : t('errorGeneric')}
                </p>
              ) : null}

              <div className="flex justify-end">
                <SubmitButton label={t('submit')} pending={t('submitting')} />
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
