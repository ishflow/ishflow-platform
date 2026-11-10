'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
/**
 * Header bell that opens a Sheet listing recent announcements. Server-rendered
 * data is passed in via props; clicking through to the full feed is a regular
 * navigation.
 */
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { ResolvedAnnouncement } from '@/platform/communications';
import { Link } from '@/platform/i18n/navigation';

import { markAnnouncementViewed, recordAnnouncementClick } from './actions';

interface Props {
  unreadCount: number;
  announcements: ReadonlyArray<
    Pick<ResolvedAnnouncement, 'id' | 'title' | 'body' | 'ctaLabel' | 'ctaUrl' | 'createdAt'> & {
      isUnread: boolean;
    }
  >;
}

const previewDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function WhatsNewBell({ unreadCount, announcements }: Props) {
  const t = useTranslations('announcements');
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Mark every visible unread item as viewed when the sheet opens.
      const unread = announcements.filter((a) => a.isUnread);
      if (unread.length > 0) {
        startTransition(async () => {
          await Promise.all(unread.map((a) => markAnnouncementViewed(a.id)));
        });
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('bellAriaLabel')}
            className="relative"
          />
        }
      >
        <Bell />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('feedTitle')}</SheetTitle>
          <SheetDescription>{t('feedDescription')}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {announcements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('feedEmpty')}</p>
          ) : (
            <ul className="space-y-3 pb-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border bg-card p-3 text-card-foreground shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">{a.title}</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {previewDateFormatter.format(a.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{a.body}</p>
                  {a.ctaUrl && a.ctaLabel && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() =>
                        startTransition(async () => {
                          await recordAnnouncementClick(a.id);
                        })
                      }
                      render={
                        <a href={a.ctaUrl} target="_blank" rel="noreferrer">
                          {a.ctaLabel}
                        </a>
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpen(false)}
            render={<Link href="/whats-new">{t('viewAll')}</Link>}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
