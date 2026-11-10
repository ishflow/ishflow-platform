'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/platform/i18n/navigation';
import type { ActionResult } from '@/platform/ui';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

type Props = {
  initial: {
    name: string;
    legalName: string | null;
    logoUrl: string | null;
    brandColor: string | null;
  };
  brandingUnlocked: boolean;
  action: (input: {
    name: string;
    legalName: string | null;
    logoUrl: string | null;
    brandColor: string | null;
  }) => Promise<ActionResult>;
};

export function OrganizationTabForm({ initial, brandingUnlocked, action }: Props) {
  const t = useTranslations('settings.organization');
  const [name, setName] = useState(initial.name);
  const [legalName, setLegalName] = useState(initial.legalName ?? '');
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '');
  const [brandColor, setBrandColor] = useState(initial.brandColor ?? '#000000');
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    startTransition(async () => {
      const result = await action({
        name: name.trim(),
        legalName: legalName.trim() || null,
        logoUrl: brandingUnlocked ? logoUrl.trim() || null : null,
        brandColor: brandingUnlocked ? brandColor : null,
      });
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
        <CardDescription>{t('description', { tenantName: initial.name })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="org-name">{t('nameLabel')}</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            maxLength={120}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="org-legal-name">{t('legalNameLabel')}</Label>
          <Input
            id="org-legal-name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            disabled={pending}
            maxLength={200}
          />
        </div>

        {brandingUnlocked ? null : (
          <Alert>
            <Lock className="h-4 w-4" aria-hidden />
            <AlertTitle>{t('brandLockedTitle')}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{t('brandLockedDescription')}</span>
              <Button variant="outline" size="sm" render={<Link href="/admin/billing" />}>
                {t('brandUpgradeBtn')}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="org-logo">{t('logoLabel')}</Label>
          <p className="text-xs text-muted-foreground">{t('logoHint')}</p>
          <Input
            id="org-logo"
            type="url"
            placeholder="https://..."
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={pending || !brandingUnlocked}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="org-brand-color">{t('brandColorLabel')}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="org-brand-color"
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              disabled={pending || !brandingUnlocked}
              className="h-10 w-16 p-1"
            />
            <Input
              type="text"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              disabled={pending || !brandingUnlocked}
              className="w-32 font-mono"
              maxLength={7}
              aria-label={t('brandColorLabel')}
            />
          </div>
        </div>

        <Button type="button" onClick={onSubmit} disabled={pending} className="w-fit">
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}
