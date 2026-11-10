'use client';

import type { LoadDemoDataResult } from '@/app/actions/onboarding';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

type Props = {
  initialOpen: boolean;
  canLoadDemo: boolean;
  onLoadDemo: () => Promise<LoadDemoDataResult>;
};

export function WelcomeDialog({ initialOpen, canLoadDemo, onLoadDemo }: Props) {
  const t = useTranslations('onboarding.welcome');
  const [open, setOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();

  if (!initialOpen) return null;

  const handleLoadDemo = () => {
    startTransition(async () => {
      const result = await onLoadDemo();
      if (result.ok) {
        toast.success(t('loading'));
        setOpen(false);
      } else {
        toast.error(t('loadDemoError'));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <p>{t('body')}</p>
          <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
            <li>{t('bullet1')}</li>
            <li>{t('bullet2')}</li>
            <li>{t('bullet3')}</li>
          </ul>
          {canLoadDemo ? (
            <p className="text-xs text-muted-foreground">{t('loadDemoHelp')}</p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {t('startFromScratch')}
          </Button>
          {canLoadDemo ? (
            <Button onClick={handleLoadDemo} disabled={isPending}>
              {isPending ? t('loading') : t('loadDemo')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
