'use server';

/**
 * Tenant-side server actions for in-app announcements. Each one validates
 * the viewer is signed in and persists per-user state.
 *
 * IDs are validated as UUIDs — we forward them straight into Prisma raw
 * SQL via `withBypass`, so loose typing would be a foot-gun.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { resolveContext } from '@/platform/auth/current-context';
import {
  dismissAnnouncement as dismissAnnouncementImpl,
  markAnnouncementViewed as markAnnouncementViewedImpl,
  recordAnnouncementClick as recordAnnouncementClickImpl,
} from '@/platform/communications';

const uuidSchema = z.string().uuid();

async function currentUserId(): Promise<string | null> {
  const ctx = await resolveContext();
  return ctx?.user.id ?? null;
}

export async function dismissAnnouncement(announcementId: string): Promise<void> {
  const parsed = uuidSchema.safeParse(announcementId);
  if (!parsed.success) return;
  const userId = await currentUserId();
  if (!userId) return;
  await dismissAnnouncementImpl(userId, parsed.data);
  revalidatePath('/', 'layout');
}

export async function markAnnouncementViewed(announcementId: string): Promise<void> {
  const parsed = uuidSchema.safeParse(announcementId);
  if (!parsed.success) return;
  const userId = await currentUserId();
  if (!userId) return;
  await markAnnouncementViewedImpl(userId, parsed.data);
}

export async function recordAnnouncementClick(announcementId: string): Promise<void> {
  const parsed = uuidSchema.safeParse(announcementId);
  if (!parsed.success) return;
  const userId = await currentUserId();
  if (!userId) return;
  await recordAnnouncementClickImpl(userId, parsed.data);
}
