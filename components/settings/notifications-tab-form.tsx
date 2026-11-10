'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { NotificationSettings } from '@/platform/notifications/settings';
import type { ActionResult } from '@/platform/ui';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

type Props = {
  initial: NotificationSettings;
  action: (input: NotificationSettings) => Promise<ActionResult>;
};

export function NotificationsTabForm({ initial, action }: Props) {
  const t = useTranslations('settings.notifications');
  const [settings, setSettings] = useState<NotificationSettings>(initial);
  const [pending, startTransition] = useTransition();

  const update = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = () => {
    if (
      !Number.isFinite(settings.lowStockThreshold) ||
      settings.lowStockThreshold < 0 ||
      !Number.isFinite(settings.overdueDaysThreshold) ||
      settings.overdueDaysThreshold < 1
    ) {
      toast.error(t('saveError', { error: 'invalidThreshold' }));
      return;
    }
    startTransition(async () => {
      const result = await action(settings);
      if (result.ok) {
        toast.success(t('savedToast'));
      } else {
        toast.error(t('saveError', { error: result.formError ?? '' }));
      }
    });
  };

  const toggles: Array<{
    key: keyof Pick<
      NotificationSettings,
      'invoiceSent' | 'paymentReceived' | 'lowStockAlert' | 'overduePayment'
    >;
    label: string;
    description: string;
  }> = [
    {
      key: 'invoiceSent',
      label: t('invoiceSentLabel'),
      description: t('invoiceSentDescription'),
    },
    {
      key: 'paymentReceived',
      label: t('paymentReceivedLabel'),
      description: t('paymentReceivedDescription'),
    },
    {
      key: 'lowStockAlert',
      label: t('lowStockAlertLabel'),
      description: t('lowStockAlertDescription'),
    },
    {
      key: 'overduePayment',
      label: t('overduePaymentLabel'),
      description: t('overduePaymentDescription'),
    },
  ];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {toggles.map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`notif-${row.key}`} className="text-sm font-medium">
                  {row.label}
                </Label>
                <p className="text-xs text-muted-foreground">{row.description}</p>
              </div>
              <Switch
                id={`notif-${row.key}`}
                checked={settings[row.key]}
                onCheckedChange={(checked) => update(row.key, checked === true)}
                disabled={pending}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t pt-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notif-low-threshold">{t('lowStockThresholdLabel')}</Label>
            <p className="text-xs text-muted-foreground">{t('lowStockThresholdDescription')}</p>
            <Input
              id="notif-low-threshold"
              type="number"
              min={0}
              max={10000}
              step={1}
              value={String(settings.lowStockThreshold)}
              onChange={(e) =>
                update('lowStockThreshold', Number.parseInt(e.target.value || '0', 10))
              }
              disabled={pending}
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notif-overdue-threshold">{t('overdueDaysThresholdLabel')}</Label>
            <p className="text-xs text-muted-foreground">{t('overdueDaysThresholdDescription')}</p>
            <Input
              id="notif-overdue-threshold"
              type="number"
              min={1}
              max={365}
              step={1}
              value={String(settings.overdueDaysThreshold)}
              onChange={(e) =>
                update('overdueDaysThreshold', Number.parseInt(e.target.value || '1', 10))
              }
              disabled={pending}
              className="w-32"
            />
          </div>
        </div>

        <Button type="button" onClick={onSave} disabled={pending} className="w-fit">
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}
