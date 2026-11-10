'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { isMarketingEditorLocale } from '@/platform/marketing/section-catalog';
import {
  BlogSlugConflictError,
  archiveBlogPost as archiveBlogPostHelper,
  createBlogPost as createBlogPostHelper,
  publishBlogPost as publishBlogPostHelper,
  updateBlogPost as updateBlogPostHelper,
} from '@/platform/super-admin/marketing';
import { revalidatePath, updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const createSchema = z.object({
  slug: z.string().regex(slugRegex, 'invalid slug').min(1).max(120),
  authorName: z.string().min(1).max(200),
  tags: z.array(z.string()),
  heroImageUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export interface CreateBlogPostState {
  status: 'idle' | 'success' | 'error';
  error?: string;
}

export async function createBlogPostAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const parsed = createSchema.safeParse({
    slug: String(formData.get('slug') ?? '').trim(),
    authorName: String(formData.get('authorName') ?? '').trim(),
    tags: parseTags(String(formData.get('tags') ?? '')),
    heroImageUrl: String(formData.get('heroImageUrl') ?? '').trim() || '',
  });
  if (!parsed.success) throw new Error(parsed.error.message);
  try {
    const post = await createBlogPostHelper({
      slug: parsed.data.slug,
      authorName: parsed.data.authorName,
      tags: parsed.data.tags,
      heroImageUrl: parsed.data.heroImageUrl ?? null,
      actorUserId: ctx.user.id,
      actorClerkId: ctx.user.clerkId,
      actorIp: h.get('x-forwarded-for'),
      actorUserAgent: h.get('user-agent'),
    });
    revalidatePath('/super-admin/marketing/blog');
    updateTag('marketing-blog');
    redirect(`/super-admin/marketing/blog/${post.id}`);
  } catch (err) {
    if (err instanceof BlogSlugConflictError) {
      throw new Error('slug_conflict');
    }
    throw err;
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(slugRegex).min(1).max(120),
  authorName: z.string().min(1).max(200),
  tags: z.array(z.string()),
  heroImageUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  translations: z.array(
    z.object({
      locale: z.string().refine(isMarketingEditorLocale, 'unsupported locale'),
      title: z.string().min(1),
      excerpt: z.string().default(''),
      body: z.string().default(''),
    }),
  ),
});

export async function updateBlogPostAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const id = String(formData.get('id') ?? '');
  const slug = String(formData.get('slug') ?? '').trim();
  const authorName = String(formData.get('authorName') ?? '').trim();
  const tags = parseTags(String(formData.get('tags') ?? ''));
  const heroImageUrl = String(formData.get('heroImageUrl') ?? '').trim();
  const translationsRaw = String(formData.get('translations') ?? '[]');
  let translations: unknown;
  try {
    translations = JSON.parse(translationsRaw);
  } catch {
    throw new Error('translations payload is not JSON');
  }
  const parsed = updateSchema.safeParse({
    id,
    slug,
    authorName,
    tags,
    heroImageUrl,
    translations,
  });
  if (!parsed.success) throw new Error(parsed.error.message);
  try {
    await updateBlogPostHelper({
      id: parsed.data.id,
      slug: parsed.data.slug,
      authorName: parsed.data.authorName,
      tags: parsed.data.tags,
      heroImageUrl: parsed.data.heroImageUrl ?? null,
      translations: parsed.data.translations,
      actorUserId: ctx.user.id,
      actorClerkId: ctx.user.clerkId,
      actorIp: h.get('x-forwarded-for'),
      actorUserAgent: h.get('user-agent'),
    });
    revalidatePath(`/super-admin/marketing/blog/${parsed.data.id}`);
    revalidatePath('/super-admin/marketing/blog');
    updateTag('marketing-blog');
    revalidatePath('/[locale]/blog', 'layout');
  } catch (err) {
    if (err instanceof BlogSlugConflictError) throw new Error('slug_conflict');
    throw err;
  }
}

export async function publishBlogPostAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('id required');
  await publishBlogPostHelper({
    id,
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for'),
    actorUserAgent: h.get('user-agent'),
  });
  revalidatePath(`/super-admin/marketing/blog/${id}`);
  revalidatePath('/super-admin/marketing/blog');
  updateTag('marketing-blog');
  revalidatePath('/[locale]/blog', 'layout');
}

export async function archiveBlogPostAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('id required');
  await archiveBlogPostHelper({
    id,
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for'),
    actorUserAgent: h.get('user-agent'),
  });
  revalidatePath(`/super-admin/marketing/blog/${id}`);
  revalidatePath('/super-admin/marketing/blog');
  updateTag('marketing-blog');
  revalidatePath('/[locale]/blog', 'layout');
}
