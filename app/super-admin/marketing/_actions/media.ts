'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import {
  MARKETING_ALLOWED_MIME,
  MARKETING_MEDIA_MAX_BYTES,
  MediaValidationError,
  deleteMarketingMedia,
  uploadMarketingMedia,
} from '@/platform/marketing/media-upload';
import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export async function uploadMediaFile(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
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
          actorClerkId: ctx.user.clerkId,
          action: 'marketing.media.upload',
          after: {
            key,
            size,
            contentType: file.type,
            originalFilename: file.name,
          } as Prisma.InputJsonValue,
          ip: h.get('x-forwarded-for') ?? null,
          userAgent: h.get('user-agent') ?? null,
        },
      }),
    );
    revalidatePath('/super-admin/marketing/media');
  } catch (err) {
    if (err instanceof MediaValidationError) throw new Error(err.code);
    throw err;
  }
}

export async function deleteMediaFileAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const key = String(formData.get('key') ?? '');
  if (!key) throw new Error('key required');
  await deleteMarketingMedia(key);
  await withBypass((tx) =>
    tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: 'marketing.media.delete',
        before: { key } as Prisma.InputJsonValue,
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    }),
  );
  revalidatePath('/super-admin/marketing/media');
}
