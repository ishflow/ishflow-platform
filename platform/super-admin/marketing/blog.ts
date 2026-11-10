import { withBypass } from '@/platform/db/tenant-context';
import type { BlogPostStatus, Prisma } from '@prisma/client';

export interface BlogPostRow {
  id: string;
  slug: string;
  status: BlogPostStatus;
  publishedAt: Date | null;
  heroImageUrl: string | null;
  authorName: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  translations: Array<{
    locale: string;
    title: string;
    excerpt: string;
    body: string;
  }>;
}

export async function listBlogPosts(): Promise<BlogPostRow[]> {
  return withBypass(async (tx) => {
    const posts = await tx.blogPost.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: { translations: true },
      take: 200,
    });
    return posts.map(mapPost);
  });
}

export async function getBlogPost(id: string): Promise<BlogPostRow | null> {
  return withBypass(async (tx) => {
    const post = await tx.blogPost.findUnique({
      where: { id },
      include: { translations: true },
    });
    return post ? mapPost(post) : null;
  });
}

type RawBlogPost = Prisma.BlogPostGetPayload<{
  include: { translations: true };
}>;

function mapPost(post: RawBlogPost): BlogPostRow {
  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    publishedAt: post.publishedAt,
    heroImageUrl: post.heroImageUrl,
    authorName: post.authorName,
    tags: post.tags,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    translations: post.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      excerpt: t.excerpt,
      body: t.body,
    })),
  };
}

export interface BlogPostVersionRow {
  id: string;
  postId: string;
  snapshot: Prisma.JsonValue;
  createdAt: Date;
  createdBy: string;
}

export async function listBlogPostVersions(postId: string): Promise<BlogPostVersionRow[]> {
  return withBypass(async (tx) => {
    const rows = await tx.blogPostVersion.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      snapshot: r.snapshot,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
    }));
  });
}

export interface CreateBlogPostInput {
  slug: string;
  authorName: string;
  tags: string[];
  heroImageUrl: string | null;
  actorUserId: string;
  actorClerkId: string;
  actorIp?: string | null;
  actorUserAgent?: string | null;
}

export async function createBlogPost(input: CreateBlogPostInput): Promise<BlogPostRow> {
  return withBypass(async (tx) => {
    const existing = await tx.blogPost.findUnique({ where: { slug: input.slug } });
    if (existing) throw new BlogSlugConflictError(input.slug);
    const post = await tx.blogPost.create({
      data: {
        slug: input.slug,
        authorName: input.authorName,
        tags: input.tags,
        heroImageUrl: input.heroImageUrl,
        createdBy: input.actorUserId,
      },
      include: { translations: true },
    });
    await tx.blogPostVersion.create({
      data: {
        postId: post.id,
        snapshot: snapshotOf(post),
        createdBy: input.actorUserId,
      },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'marketing.blog.create',
        after: snapshotOf(post),
        ip: input.actorIp ?? null,
        userAgent: input.actorUserAgent ?? null,
      },
    });
    return mapPost(post);
  });
}

export class BlogSlugConflictError extends Error {
  constructor(public readonly slug: string) {
    super(`Slug "${slug}" already exists`);
    this.name = 'BlogSlugConflictError';
  }
}

export interface UpdateBlogPostInput {
  id: string;
  slug: string;
  authorName: string;
  tags: string[];
  heroImageUrl: string | null;
  translations: ReadonlyArray<{
    locale: string;
    title: string;
    excerpt: string;
    body: string;
  }>;
  actorUserId: string;
  actorClerkId: string;
  actorIp?: string | null;
  actorUserAgent?: string | null;
}

export async function updateBlogPost(input: UpdateBlogPostInput): Promise<BlogPostRow> {
  return withBypass(async (tx) => {
    const before = await tx.blogPost.findUnique({
      where: { id: input.id },
      include: { translations: true },
    });
    if (!before) throw new Error('post not found');
    if (input.slug !== before.slug) {
      const clash = await tx.blogPost.findUnique({ where: { slug: input.slug } });
      if (clash) throw new BlogSlugConflictError(input.slug);
    }
    await tx.blogPost.update({
      where: { id: input.id },
      data: {
        slug: input.slug,
        authorName: input.authorName,
        tags: input.tags,
        heroImageUrl: input.heroImageUrl,
      },
    });
    // Replace translations: delete missing + upsert provided.
    const providedLocales = new Set(input.translations.map((t) => t.locale));
    const toDelete = before.translations
      .map((t) => t.locale)
      .filter((l) => !providedLocales.has(l));
    if (toDelete.length > 0) {
      await tx.blogPostTranslation.deleteMany({
        where: { postId: input.id, locale: { in: toDelete } },
      });
    }
    for (const t of input.translations) {
      await tx.blogPostTranslation.upsert({
        where: { postId_locale: { postId: input.id, locale: t.locale } },
        create: {
          postId: input.id,
          locale: t.locale,
          title: t.title,
          excerpt: t.excerpt,
          body: t.body,
        },
        update: { title: t.title, excerpt: t.excerpt, body: t.body },
      });
    }
    const post = await tx.blogPost.findUniqueOrThrow({
      where: { id: input.id },
      include: { translations: true },
    });
    await tx.blogPostVersion.create({
      data: {
        postId: post.id,
        snapshot: snapshotOf(post),
        createdBy: input.actorUserId,
      },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'marketing.blog.update',
        before: snapshotOf(before),
        after: snapshotOf(post),
        ip: input.actorIp ?? null,
        userAgent: input.actorUserAgent ?? null,
      },
    });
    return mapPost(post);
  });
}

export interface BlogStatusInput {
  id: string;
  actorUserId: string;
  actorClerkId: string;
  actorIp?: string | null;
  actorUserAgent?: string | null;
}

async function changeBlogStatus(
  input: BlogStatusInput,
  nextStatus: BlogPostStatus,
  action: 'marketing.blog.publish' | 'marketing.blog.archive',
): Promise<BlogPostRow> {
  return withBypass(async (tx) => {
    const before = await tx.blogPost.findUnique({
      where: { id: input.id },
      include: { translations: true },
    });
    if (!before) throw new Error('post not found');
    const publishedAt =
      nextStatus === 'published' && !before.publishedAt ? new Date() : before.publishedAt;
    await tx.blogPost.update({
      where: { id: input.id },
      data: { status: nextStatus, publishedAt },
    });
    const after = await tx.blogPost.findUniqueOrThrow({
      where: { id: input.id },
      include: { translations: true },
    });
    await tx.blogPostVersion.create({
      data: {
        postId: after.id,
        snapshot: snapshotOf(after),
        createdBy: input.actorUserId,
      },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action,
        before: { status: before.status, publishedAt: before.publishedAt } as Prisma.InputJsonValue,
        after: { status: after.status, publishedAt: after.publishedAt } as Prisma.InputJsonValue,
        ip: input.actorIp ?? null,
        userAgent: input.actorUserAgent ?? null,
      },
    });
    return mapPost(after);
  });
}

export function publishBlogPost(input: BlogStatusInput): Promise<BlogPostRow> {
  return changeBlogStatus(input, 'published', 'marketing.blog.publish');
}

export function archiveBlogPost(input: BlogStatusInput): Promise<BlogPostRow> {
  return changeBlogStatus(input, 'archived', 'marketing.blog.archive');
}

function snapshotOf(
  post: Prisma.BlogPostGetPayload<{ include: { translations: true } }>,
): Prisma.InputJsonValue {
  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    heroImageUrl: post.heroImageUrl,
    authorName: post.authorName,
    tags: post.tags,
    translations: post.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      excerpt: t.excerpt,
      body: t.body,
    })),
  };
}
