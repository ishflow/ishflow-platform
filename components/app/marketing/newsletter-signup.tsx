'use client';

import { subscribeNewsletter } from '@/app/[locale]/(marketing)/_actions/newsletter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

export function NewsletterSignup({ className }: { className?: string }) {
  const t = useTranslations('marketing.newsletter');
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('idle');
    setMessage('');
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await subscribeNewsletter({ email: trimmed, locale, source: 'footer' });
      if (res.ok) {
        setStatus('ok');
        setMessage(res.error === 'already_subscribed' ? t('alreadySubscribed') : t('checkInbox'));
        setEmail('');
      } else if (res.error === 'invalid_email') {
        setStatus('error');
        setMessage(t('invalidEmail'));
      } else {
        setStatus('error');
        setMessage(t('failed'));
      }
    });
  };

  return (
    <div className={className}>
      <p className="text-sm font-medium text-foreground">{t('title')}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t('body')}</p>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <Input
          type="email"
          required
          placeholder={t('placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          aria-label={t('placeholder')}
          className="flex-1"
        />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : status === 'ok' ? (
            <Check className="size-4" aria-hidden />
          ) : null}
          {t('cta')}
        </Button>
      </form>
      {message && (
        <output
          aria-live="polite"
          className={cn(
            'mt-2 block text-xs',
            status === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
          )}
        >
          {message}
        </output>
      )}
    </div>
  );
}
