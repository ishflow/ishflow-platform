'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { redirect } from '@/platform/i18n/navigation';
import {
  MARKETING_ALLOWED_MIME,
  MARKETING_MEDIA_MAX_BYTES,
  MediaValidationError,
  deleteMarketingMedia,
  uploadMarketingMedia,
} from '@/platform/marketing/media-upload';
import {
  BlogSlugConflictError,
  createBlogPost,
  isLeadStatus,
  restoreMarketingSectionVersion,
  unsubscribeNewsletter,
  updateLeadStatus,
} from '@/platform/super-admin/marketing';
import type { Prisma } from '@prisma/client';
import { getLocale } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

/**
 * Server actions for the V2 (locale-scoped) super-admin CMS pages.
 *
 * The business logic lives in `platform/super-admin/marketing` + the public
 * `platform/marketing` helpers — these wrappers only add the SA auth gate and
 * the V2-correct cache revalidation / redirect. They mirror the locale-free
 * `app/super-admin/marketing/_actions/*` actions but revalidate the
 * `/super-admin/cms/*` routes the V2 shell actually renders. `revalidatePath`
 * is invoked with the locale-free literal, matching the established V2 SA
 * action convention (see `tenants/[id]/_actions/tenant-ops.ts`).
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

// --- blog -------------------------------------------------------------

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const createBlogSchema = z.object({
  slug: z.string().regex(slugRegex, 'invalid_slug').min(1).max(120),
  authorName: z.string().min(1).max(200),
  tags: z.array(z.string()),
  heroImageUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export async function createBlogPostV2(formData: FormData): Promise<void> {
  const a = await actor();
  const parsed = createBlogSchema.safeParse({
    slug: String(formData.get('slug') ?? '').trim(),
    authorName: String(formData.get('authorName') ?? '').trim(),
    tags: String(formData.get('tags') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
    heroImageUrl: String(formData.get('heroImageUrl') ?? '').trim() || '',
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));

  let postId: string;
  try {
    const post = await createBlogPost({
      slug: parsed.data.slug,
      authorName: parsed.data.authorName,
      tags: parsed.data.tags,
      heroImageUrl: parsed.data.heroImageUrl ?? null,
      ...a,
    });
    postId = post.id;
  } catch (err) {
    if (err instanceof BlogSlugConflictError) throw new Error('slug_conflict');
    throw err;
  }
  revalidatePath('/super-admin/cms/blog');
  const locale = await getLocale();
  redirect({ href: `/super-admin/cms/blog/${postId}`, locale });
}

// --- leads ------------------------------------------------------------

export async function updateLeadStatusV2(formData: FormData): Promise<void> {
  const a = await actor();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id) throw new Error('id required');
  if (!isLeadStatus(status)) throw new Error('invalid status');
  await updateLeadStatus({
    id,
    status,
    actorClerkId: a.actorClerkId,
    actorIp: a.actorIp,
    actorUserAgent: a.actorUserAgent,
  });
  revalidatePath('/super-admin/cms/leads');
}

// --- newsletter -------------------------------------------------------

export async function unsubscribeNewsletterV2(formData: FormData): Promise<void> {
  const a = await actor();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('id required');
  await unsubscribeNewsletter({
    id,
    actorClerkId: a.actorClerkId,
    actorIp: a.actorIp,
    actorUserAgent: a.actorUserAgent,
  });
  revalidatePath('/super-admin/cms/newsletter');
}

// --- sections ---------------------------------------------------------

export async function restoreSectionVersionV2(formData: FormData): Promise<void> {
  const a = await actor();
  const versionId = String(formData.get('versionId') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '');
  if (!versionId) throw new Error('versionId is required');
  await restoreMarketingSectionVersion({ versionId, ...a });
  if (sectionId) revalidatePath(`/super-admin/cms/sections/${sectionId}/versions`);
  revalidatePath('/super-admin/cms/sections');
}

// --- media ------------------------------------------------------------

export async function uploadMediaV2(formData: FormData): Promise<void> {
  const a = await actor();
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('no_file');
  if (file.size === 0) throw new Error('empty_file');
  if (file.size > MARKETING_MEDIA_MAX_BYTES) throw new Error('too_large');
  if (!MARKETING_ALLOWED_MIME.includes(file.type)) throw new Error('bad_mime');

  const buffer = new Uint8Array(await file.arrayBuffer());
  try {
    const { key, size } = await uploadMarketingMedia({
      filename: file.name,
      contentType: file.type,
      bytes: buffer,
    });
    await withBypass((tx) =>
      tx.platformAuditLog.create({
        data: {
          actorClerkId: a.actorClerkId,
          action: 'marketing.media.upload',
          after: {
            key,
            size,
            contentType: file.type,
            originalFilename: file.name,
          } as Prisma.InputJsonValue,
          ip: a.actorIp ?? null,
          userAgent: a.actorUserAgent ?? null,
        },
      }),
    );
    revalidatePath('/super-admin/cms/media');
  } catch (err) {
    if (err instanceof MediaValidationError) throw new Error(err.code);
    throw err;
  }
}

export async function deleteMediaV2(formData: FormData): Promise<void> {
  const a = await actor();
  const key = String(formData.get('key') ?? '');
  if (!key) throw new Error('key required');
  await deleteMarketingMedia(key);
  await withBypass((tx) =>
    tx.platformAuditLog.create({
      data: {
        actorClerkId: a.actorClerkId,
        action: 'marketing.media.delete',
        before: { key } as Prisma.InputJsonValue,
        ip: a.actorIp ?? null,
        userAgent: a.actorUserAgent ?? null,
      },
    }),
  );
  revalidatePath('/super-admin/cms/media');
}
