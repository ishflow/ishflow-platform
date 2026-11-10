/**
 * Per-user announcement state helpers. All writes use `withBypass` because
 * `user_announcement_state` is not tenant-scoped: it is indexed by the
 * global `userId` (Clerk-synced User row).
 *
 * Each helper is idempotent and increments `impressionCount` on the first
 * touch. Callers are responsible for verifying the user has access to the
 * announcement (handled by the layout resolver + the server-action wrapper).
 */
import { withBypass } from '@/platform/db/tenant-context';

async function upsertState(
  userId: string,
  announcementId: string,
  fields: {
    viewedAt?: Date;
    dismissedAt?: Date;
    clickedThroughAt?: Date;
  },
): Promise<void> {
  await withBypass(async (tx) => {
    const existing = await tx.userAnnouncementState.findUnique({
      where: { userId_announcementId: { userId, announcementId } },
    });
    if (existing) {
      await tx.userAnnouncementState.update({
        where: { userId_announcementId: { userId, announcementId } },
        data: {
          ...(fields.viewedAt ? { viewedAt: existing.viewedAt ?? fields.viewedAt } : {}),
          ...(fields.dismissedAt
            ? { dismissedAt: existing.dismissedAt ?? fields.dismissedAt }
            : {}),
          ...(fields.clickedThroughAt
            ? { clickedThroughAt: existing.clickedThroughAt ?? fields.clickedThroughAt }
            : {}),
          impressionCount: { increment: 1 },
        },
      });
      return;
    }
    await tx.userAnnouncementState.create({
      data: {
        userId,
        announcementId,
        viewedAt: fields.viewedAt ?? null,
        dismissedAt: fields.dismissedAt ?? null,
        clickedThroughAt: fields.clickedThroughAt ?? null,
        impressionCount: 1,
      },
    });
  });
}

export async function markAnnouncementViewed(
  userId: string,
  announcementId: string,
): Promise<void> {
  await upsertState(userId, announcementId, { viewedAt: new Date() });
}

export async function dismissAnnouncement(userId: string, announcementId: string): Promise<void> {
  const now = new Date();
  await upsertState(userId, announcementId, { viewedAt: now, dismissedAt: now });
}

export async function recordAnnouncementClick(
  userId: string,
  announcementId: string,
): Promise<void> {
  const now = new Date();
  await upsertState(userId, announcementId, { viewedAt: now, clickedThroughAt: now });
}
