'use client';

import { submitContactForm } from '@/app/[locale]/(marketing)/_actions/contact';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

const SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;

export function ContactForm() {
  const t = useTranslations('marketing.contact');
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<string>('');

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      company: String(fd.get('company') ?? ''),
      size,
      message: String(fd.get('message') ?? ''),
      source: 'contact',
    };
    startTransition(async () => {
      const res = await submitContactForm(payload);
      if (res.ok) {
        setDone(true);
      } else if (res.error === 'invalid_email') {
        setError(t('errInvalidEmail'));
      } else if (res.error === 'invalid_name') {
        setError(t('errInvalidName'));
      } else if (res.error === 'invalid_message') {
        setError(t('errInvalidMessage'));
      } else {
        setError(t('errGeneric'));
      }
    });
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
        <h3 className="mt-4 text-lg font-semibold">{t('successTitle')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('successBody')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">{t('name')}</Label>
          <Input id="contact-name" name="name" required maxLength={120} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">{t('email')}</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-company">{t('company')}</Label>
          <Input id="contact-company" name="company" maxLength={160} autoComplete="organization" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-size">{t('size')}</Label>
          <Select value={size} onValueChange={(v) => setSize(v ?? '')}>
            <SelectTrigger id="contact-size">
              <SelectValue placeholder={t('sizePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message">{t('message')}</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={4000}
          minLength={10}
          placeholder={t('messagePlaceholder')}
        />
      </div>

      {error && (
        <p className={cn('text-sm text-destructive')} role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t('privacyNote')}</p>
        <Button type="submit" disabled={pending} size="lg">
          {pending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
