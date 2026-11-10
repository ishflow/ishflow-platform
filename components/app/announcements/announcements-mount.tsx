/**
 * Server component that resolves the viewer's active announcements once
 * and renders the three surface components: banner (top), popup (modal),
 * bell (header trigger). Mounted from `app/[locale]/(platform)/layout.tsx`
 * with the controller's three-line edit.
 *
 * The bell renders as a fixed-position element so the existing `<Header>`
 * does not need to know about it.
 */
import { resolveContext } from '@/platform/auth/current-context';
import { loadActiveAnnouncements } from '@/platform/communications';

import { AnnouncementBanner } from './announcement-banner';
import { AnnouncementPopup } from './announcement-popup';
import { WhatsNewBell } from './whats-new-bell';

export async function AnnouncementsBanner() {
  const ctx = await resolveContext();
  if (!ctx?.tenant) return null;
  const items = await loadActiveAnnouncements(ctx);
  const banner = items.find((a) => a.surface === 'banner');
  if (!banner) return null;
  return (
    <AnnouncementBanner
      announcement={{
        id: banner.id,
        title: banner.title,
        body: banner.body,
        ctaLabel: banner.ctaLabel,
        ctaUrl: banner.ctaUrl,
        dismissible: banner.dismissible,
      }}
    />
  );
}

export async function AnnouncementsPopup() {
  const ctx = await resolveContext();
  if (!ctx?.tenant) return null;
  const items = await loadActiveAnnouncements(ctx);
  // Only fire a popup the viewer has not already seen.
  const popup = items.find((a) => a.surface === 'popup' && !a.state?.viewedAt);
  if (!popup) return null;
  return (
    <AnnouncementPopup
      announcement={{
        id: popup.id,
        title: popup.title,
        body: popup.body,
        ctaLabel: popup.ctaLabel,
        ctaUrl: popup.ctaUrl,
        dismissible: popup.dismissible,
      }}
    />
  );
}

export async function AnnouncementsBell() {
  const ctx = await resolveContext();
  if (!ctx?.tenant) return null;
  const items = await loadActiveAnnouncements(ctx, { includeDismissed: true });
  if (items.length === 0) return null;
  const unreadCount = items.filter((a) => !a.state?.viewedAt).length;
  return (
    <div className="fixed top-2.5 right-32 z-40 sm:right-36">
      <WhatsNewBell
        unreadCount={unreadCount}
        announcements={items.slice(0, 10).map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          ctaLabel: a.ctaLabel,
          ctaUrl: a.ctaUrl,
          createdAt: a.createdAt,
          isUnread: !a.state?.viewedAt,
        }))}
      />
    </div>
  );
}
