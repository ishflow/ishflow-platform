'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { localeLabels, locales } from '@/platform/i18n/config';
import type { ActionResult } from '@/platform/ui';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

type Props = {
  initial: { currency: string; locale: string; markupPct: number };
  currencyOptions: readonly string[];
  action: (input: {
    currency: string;
    locale: string;
    markupPct: number;
  }) => Promise<ActionResult>;
};

export function GeneralTabForm({ initial, currencyOptions, action }: Props) {
  const t = useTranslations('settings.general');
  const [currency, setCurrency] = useState(initial.currency);
  const [locale, setLocale] = useState(initial.locale);
  const [markup, setMarkup] = useState<string>(String(initial.markupPct));
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    const markupPct = Number.parseFloat(markup);
    if (Number.isNaN(markupPct) || markupPct < 0 || markupPct > 100) {
      toast.error(t('saveError', { error: 'invalid' }));
      return;
    }
    startTransition(async () => {
      const result = await action({ currency, locale, markupPct });
      if (result.ok) {
        toast.success(t('savedToast'));
      } else {
        toast.error(t('saveError', { error: result.formError ?? '' }));
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-currency">{t('currencyLabel')}</Label>
          <p className="text-xs text-muted-foreground">{t('currencyDescription')}</p>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v ?? currency)}
            disabled={pending}
          >
            <SelectTrigger id="settings-currency" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-locale">{t('localeLabel')}</Label>
          <p className="text-xs text-muted-foreground">{t('localeDescription')}</p>
          <Select value={locale} onValueChange={(v) => setLocale(v ?? locale)} disabled={pending}>
            <SelectTrigger id="settings-locale" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((l) => (
                <SelectItem key={l} value={l}>
                  {localeLabels[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-markup">{t('markupLabel')}</Label>
          <p className="text-xs text-muted-foreground">{t('markupDescription')}</p>
          <Input
            id="settings-markup"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            disabled={pending}
            className="w-32"
          />
        </div>
        <Button type="button" onClick={onSubmit} disabled={pending} className="w-fit">
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}
