'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { redirect } from '@/platform/i18n/navigation';
import type { AnnouncementSurface, Prisma } from '@prisma/client';
import { getLocale } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

/**
 * Server actions for the V2 (locale-scoped) super-admin communications pages.
 *
 * These drive the real in-app **announcement** system (`marketingAnnouncement`
 * + `marketingAnnouncementVersion` + `platformAuditLog`), mirroring the
 * locale-free `app/super-admin/communications/actions.ts` but redirecting /
 * revalidating the `/super-admin/comms/*` routes the V2 shell renders. There is
 * no email channel — announcements surface in-app (banner / popup / feed), so
 * there are no "open/click/bounce" mutations here.
 */

async function actor() {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  return {
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for'),
    actorUserAgent: h.get('user-agent'),
  };
}

const SURFACES = ['banner', 'popup', 'feed_only'] as const;

const createSchema = z.object({
  internalKey: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-_]*$/, 'invalid_key'),
  surface: z.enum(SURFACES),
  title: z.string().min(1),
  body: z.string().default(''),
});

export async function createComms(formData: FormData): Promise<void> {
  const a = await actor();
  const parsed = createSchema.safeParse({
    internalKey: String(formData.get('internalKey') ?? '').trim(),
    surface: String(formData.get('surface') ?? ''),
    title: String(formData.get('title') ?? '').trim(),
    body: String(formData.get('body') ?? '').trim(),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));

  const locale = await getLocale();
  const id = await withBypass(async (tx) => {
    const existing = await tx.marketingAnnouncement.findUnique({
      where: { internalKey: parsed.data.internalKey },
      select: { id: true },
    });
    if (existing) throw new Error('key_conflict');
    const created = await tx.marketingAnnouncement.create({
      data: {
        internalKey: parsed.data.internalKey,
        surface: parsed.data.surface as AnnouncementSurface,
        status: 'draft',
        createdBy: a.actorUserId,
        translations: {
          create: [{ locale, title: parsed.data.title, body: parsed.data.body }],
        },
      },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: a.actorClerkId,
        action: 'announcement.created',
        after: {
          internalKey: created.internalKey,
          surface: created.surface,
          status: created.status,
        } as Prisma.InputJsonValue,
        ip: a.actorIp ?? null,
        userAgent: a.actorUserAgent ?? null,
      },
    });
    return created.id;
  });

  revalidatePath('/super-admin/comms');
  redirect({ href: `/super-admin/comms/${id}`, locale });
}

async function setStatus(
  id: string,
  status: 'live' | 'archived',
  action: 'announcement.published' | 'announcement.recalled',
): Promise<void> {
  const a = await actor();
  await withBypass(async (tx) => {
    const before = await tx.marketingAnnouncement.findUnique({ where: { id } });
    if (!before) throw new Error('announcement not found');
    const updated = await tx.marketingAnnouncement.update({
      where: { id },
      data: status === 'archived' ? { status, endAt: new Date() } : { status },
      include: { translations: true },
    });
    if (status === 'live') {
      await tx.marketingAnnouncementVersion.create({
        data: {
          announcementId: id,
          snapshot: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
          createdBy: a.actorUserId,
        },
      });
    }
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: a.actorClerkId,
        action,
        before: { status: before.status } as Prisma.InputJsonValue,
        after: { status: updated.status } as Prisma.InputJsonValue,
        ip: a.actorIp ?? null,
        userAgent: a.actorUserAgent ?? null,
      },
    });
  });
  revalidatePath('/super-admin/comms');
  revalidatePath(`/super-admin/comms/${id}`);
}

export async function publishComms(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('id required');
  await setStatus(id, 'live', 'announcement.published');
}

export async function recallComms(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('id required');
  await setStatus(id, 'archived', 'announcement.recalled');
}
