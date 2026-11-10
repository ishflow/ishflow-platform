import Link from 'next/link';

import {
  AnnouncementForm,
  emptyInitial,
} from '@/components/app/super-admin/communications/announcement-form';
import { Button } from '@/components/ui/button';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { ChevronLeft } from 'lucide-react';

import { createAnnouncement } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewAnnouncementPage() {
  const dict = await getSuperAdminDict();
  const t = dict.communications;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          render={<Link href="/super-admin/communications" />}
        >
          <ChevronLeft className="size-4" />
          {t.detail.back}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t.actions.new}</h1>
      </header>
      <AnnouncementForm
        dict={dict}
        initial={emptyInitial()}
        action={createAnnouncement}
        submitLabel={t.actions.saveDraft}
      />
    </div>
  );
}
