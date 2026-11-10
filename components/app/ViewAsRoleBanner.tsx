'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export function ViewAsRoleBanner({ role }: { role: string }) {
  const router = useRouter();
  const t = useTranslations('viewAs.banner');

  async function stopViewAs() {
    await fetch('/api/view-as-role', { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
      <span>{t('description', { role })}</span>
      <Button size="sm" variant="outline" onClick={stopViewAs}>
        {t('stop')}
      </Button>
    </div>
  );
}
