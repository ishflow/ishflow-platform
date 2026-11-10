'use client';

import { Megaphone, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
/**
 * Slim banner that surfaces the most-recent unread announcement above the
 * platform header. Server-rendered ancestor passes pre-resolved data;
 * dismissal is a client transition that re-validates the layout so the
 * banner disappears on the next request.
 */
import { useTransition } from 'react';

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ResolvedAnnouncement } from '@/platform/communications';

import { dismissAnnouncement, recordAnnouncementClick } from './actions';

interface Props {
  announcement: Pick<
    ResolvedAnnouncement,
    'id' | 'title' | 'body' | 'ctaLabel' | 'ctaUrl' | 'dismissible'
  >;
}

export function AnnouncementBanner({ announcement }: Props) {
  const t = useTranslations('announcements');
  const [pending, startTransition] = useTransition();

  const onDismiss = () => {
    if (pending) return;
    startTransition(async () => {
      await dismissAnnouncement(announcement.id);
    });
  };

  const onCtaClick = () => {
    if (!announcement.ctaUrl) return;
    startTransition(async () => {
      await recordAnnouncementClick(announcement.id);
    });
  };

  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <Megaphone />
      <AlertTitle>{announcement.title}</AlertTitle>
      <AlertDescription>{announcement.body}</AlertDescription>
      {(announcement.ctaUrl || announcement.dismissible) && (
        <AlertAction>
          <div className="flex items-center gap-1">
            {announcement.ctaUrl && announcement.ctaLabel && (
              <Button
                size="sm"
                variant="outline"
                onClick={onCtaClick}
                render={
                  <a href={announcement.ctaUrl} target="_blank" rel="noreferrer">
                    {announcement.ctaLabel}
                  </a>
                }
              />
            )}
            {announcement.dismissible && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDismiss}
                disabled={pending}
                aria-label={t('dismiss')}
              >
                <X />
              </Button>
            )}
          </div>
        </AlertAction>
      )}
    </Alert>
  );
}
