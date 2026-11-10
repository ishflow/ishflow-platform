'use client';

import { useTranslations } from 'next-intl';
/**
 * Modal that auto-opens on page load when an unread popup-surface
 * announcement is available. Marks `viewedAt` on close so the same popup
 * never auto-fires twice for the same user.
 */
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ResolvedAnnouncement } from '@/platform/communications';

import { markAnnouncementViewed, recordAnnouncementClick } from './actions';

interface Props {
  announcement: Pick<
    ResolvedAnnouncement,
    'id' | 'title' | 'body' | 'ctaLabel' | 'ctaUrl' | 'dismissible'
  >;
}

export function AnnouncementPopup({ announcement }: Props) {
  const t = useTranslations('announcements');
  const [open, setOpen] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      startTransition(async () => {
        await markAnnouncementViewed(announcement.id);
      });
    }
  }, [open, announcement.id]);

  const onCtaClick = () => {
    if (!announcement.ctaUrl) return;
    startTransition(async () => {
      await recordAnnouncementClick(announcement.id);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-foreground">
            {announcement.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('later')}
          </Button>
          {announcement.ctaUrl && announcement.ctaLabel && (
            <Button
              onClick={() => {
                onCtaClick();
                setOpen(false);
              }}
              render={
                <a href={announcement.ctaUrl} target="_blank" rel="noreferrer">
                  {announcement.ctaLabel}
                </a>
              }
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
