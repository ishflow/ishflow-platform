import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ALL_LOCALES,
  AnnouncementForm,
  type AnnouncementFormInitial,
  type AnnouncementLocale,
  emptyInitial,
} from '@/components/app/super-admin/communications/announcement-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, LineChart } from 'lucide-react';

import { parseTargeting } from '@/platform/communications/targeting';
import { withBypass } from '@/platform/db/tenant-context';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';

import { PublishRecallControls } from '@/components/app/super-admin/communications/publish-recall-controls';
import { publishAnnouncement, recallAnnouncement, updateAnnouncement } from '../actions';

export const dynamic = 'force-dynamic';

function isoToInputLocal(d: Date | null): string {
  if (!d) return '';
  // YYYY-MM-DDTHH:mm in UTC — close enough for operator UI; precision is fine.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function buildInitial(row: {
  internalKey: string;
  surface: AnnouncementFormInitial['surface'];
  status: AnnouncementFormInitial['status'];
  startAt: Date | null;
  endAt: Date | null;
  dismissible: boolean;
  ctaLabel: string | null;
  ctaUrl: string | null;
  targeting: unknown;
  translations: ReadonlyArray<{ locale: string; title: string; body: string }>;
}): AnnouncementFormInitial {
  const base = emptyInitial();
  const merged: Record<AnnouncementLocale, { title: string; body: string }> = {
    ...base.translations,
  };
  for (const t of row.translations) {
    if ((ALL_LOCALES as readonly string[]).includes(t.locale)) {
      merged[t.locale as AnnouncementLocale] = { title: t.title, body: t.body };
    }
  }
  const targeting = parseTargeting(row.targeting);
  return {
    internalKey: row.internalKey,
    surface: row.surface,
    status: row.status,
    startAt: isoToInputLocal(row.startAt),
    endAt: isoToInputLocal(row.endAt),
    dismissible: row.dismissible,
    ctaLabel: row.ctaLabel ?? '',
    ctaUrl: row.ctaUrl ?? '',
    translations: merged,
    targeting: {
      plans: (targeting.plans ?? []).join(', '),
      addons: (targeting.addons ?? []).join(', '),
      roles: (targeting.roles ?? []).join(', '),
      locales: (targeting.locales ?? []).join(', '),
      tenantIds: (targeting.tenantIds ?? []).join(', '),
    },
  };
}

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row, dict] = await Promise.all([
    withBypass((tx) =>
      tx.marketingAnnouncement.findUnique({
        where: { id },
        include: { translations: true },
      }),
    ),
    getSuperAdminDict(),
  ]);
  if (!row) notFound();

  const initial = buildInitial(row);
  const t = dict.communications;

  // Bound action that closes over the id so the form can stay surface-agnostic.
  const updateAction = async (fd: FormData): Promise<void> => {
    'use server';
    await updateAnnouncement(id, fd);
  };

  const publishAction = async (): Promise<void> => {
    'use server';
    await publishAnnouncement(id);
  };

  const recallAction = async (): Promise<void> => {
    'use server';
    await recallAnnouncement(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          render={<Link href="/super-admin/communications" />}
        >
          <ChevronLeft className="size-4" />
          {t.detail.back}
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{row.internalKey}</h1>
            <p className="text-sm text-muted-foreground">
              {t.surfaces[row.surface]} · {t.statuses[row.status]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/super-admin/communications/${id}/analytics`} />}
            >
              <LineChart className="size-4" />
              {t.detail.analyticsLink}
            </Button>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t.actions.publish}</CardTitle>
        </CardHeader>
        <CardContent>
          <PublishRecallControls
            status={row.status}
            publishAction={publishAction}
            recallAction={recallAction}
            dict={dict}
          />
        </CardContent>
      </Card>

      <AnnouncementForm
        dict={dict}
        initial={initial}
        action={updateAction}
        submitLabel={dict.common.save}
      />
    </div>
  );
}
