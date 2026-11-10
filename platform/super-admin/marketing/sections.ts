import { withBypass } from '@/platform/db/tenant-context';
import { Prisma } from '@prisma/client';

export interface SectionRow {
  id: string;
  pageKey: string;
  sectionKey: string;
  locale: string;
  content: Prisma.JsonValue;
  updatedAt: Date;
  updatedBy: string;
}

/** All sections grouped by pageKey, newest update first per group. */
export async function listMarketingSections(): Promise<SectionRow[]> {
  return withBypass(async (tx) => {
    const rows = await tx.marketingSection.findMany({
      orderBy: [{ pageKey: 'asc' }, { sectionKey: 'asc' }, { locale: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      pageKey: r.pageKey,
      sectionKey: r.sectionKey,
      locale: r.locale,
      content: r.content,
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy,
    }));
  });
}

/** Fetch one (pageKey, sectionKey, locale) row or null. */
export async function getMarketingSection(
  pageKey: string,
  sectionKey: string,
  locale: string,
): Promise<SectionRow | null> {
  return withBypass(async (tx) => {
    const row = await tx.marketingSection.findUnique({
      where: { pageKey_sectionKey_locale: { pageKey, sectionKey, locale } },
    });
    if (!row) return null;
    return {
      id: row.id,
      pageKey: row.pageKey,
      sectionKey: row.sectionKey,
      locale: row.locale,
      content: row.content,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  });
}

export interface SectionVersionRow {
  id: string;
  sectionId: string;
  snapshot: Prisma.JsonValue;
  createdAt: Date;
  createdBy: string;
}

export async function listMarketingSectionVersions(
  sectionId: string,
): Promise<SectionVersionRow[]> {
  return withBypass(async (tx) => {
    const rows = await tx.marketingSectionVersion.findMany({
      where: { sectionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      sectionId: r.sectionId,
      snapshot: r.snapshot,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
    }));
  });
}

export interface UpsertSectionInput {
  pageKey: string;
  sectionKey: string;
  locale: string;
  content: Prisma.InputJsonValue;
  actorUserId: string;
  actorClerkId: string;
  actorIp?: string | null;
  actorUserAgent?: string | null;
}

/**
 * Upsert a section + write a version snapshot + write a platform audit
 * log entry. All three writes happen inside the same bypass transaction
 * so the editor never produces orphan history.
 */
export async function upsertMarketingSection(input: UpsertSectionInput): Promise<SectionRow> {
  return withBypass(async (tx) => {
    const before = await tx.marketingSection.findUnique({
      where: {
        pageKey_sectionKey_locale: {
          pageKey: input.pageKey,
          sectionKey: input.sectionKey,
          locale: input.locale,
        },
      },
    });
    const upserted = await tx.marketingSection.upsert({
      where: {
        pageKey_sectionKey_locale: {
          pageKey: input.pageKey,
          sectionKey: input.sectionKey,
          locale: input.locale,
        },
      },
      create: {
        pageKey: input.pageKey,
        sectionKey: input.sectionKey,
        locale: input.locale,
        content: input.content,
        updatedBy: input.actorUserId,
      },
      update: {
        content: input.content,
        updatedBy: input.actorUserId,
      },
    });
    await tx.marketingSectionVersion.create({
      data: {
        sectionId: upserted.id,
        snapshot: input.content,
        createdBy: input.actorUserId,
      },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'marketing.section.upsert',
        before: before
          ? ({
              pageKey: before.pageKey,
              sectionKey: before.sectionKey,
              locale: before.locale,
              content: before.content,
            } as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        after: {
          pageKey: upserted.pageKey,
          sectionKey: upserted.sectionKey,
          locale: upserted.locale,
          content: upserted.content,
        } as Prisma.InputJsonValue,
        ip: input.actorIp ?? null,
        userAgent: input.actorUserAgent ?? null,
      },
    });
    return {
      id: upserted.id,
      pageKey: upserted.pageKey,
      sectionKey: upserted.sectionKey,
      locale: upserted.locale,
      content: upserted.content,
      updatedAt: upserted.updatedAt,
      updatedBy: upserted.updatedBy,
    };
  });
}

export interface RestoreVersionInput {
  versionId: string;
  actorUserId: string;
  actorClerkId: string;
  actorIp?: string | null;
  actorUserAgent?: string | null;
}

/**
 * Restore a section to a previous snapshot. Creates a new version row
 * marking the restore (so future history shows that an old snapshot was
 * promoted) and writes an audit log entry.
 */
export async function restoreMarketingSectionVersion(
  input: RestoreVersionInput,
): Promise<SectionRow> {
  return withBypass(async (tx) => {
    const version = await tx.marketingSectionVersion.findUnique({
      where: { id: input.versionId },
      include: { section: true },
    });
    if (!version) throw new Error('version not found');
    const before = version.section;
    const updated = await tx.marketingSection.update({
      where: { id: version.sectionId },
      data: {
        content: version.snapshot as Prisma.InputJsonValue,
        updatedBy: input.actorUserId,
      },
    });
    await tx.marketingSectionVersion.create({
      data: {
        sectionId: updated.id,
        snapshot: version.snapshot as Prisma.InputJsonValue,
        createdBy: input.actorUserId,
      },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'marketing.section.restore',
        before: { content: before.content } as Prisma.InputJsonValue,
        after: {
          versionId: version.id,
          content: version.snapshot,
        } as Prisma.InputJsonValue,
        ip: input.actorIp ?? null,
        userAgent: input.actorUserAgent ?? null,
      },
    });
    return {
      id: updated.id,
      pageKey: updated.pageKey,
      sectionKey: updated.sectionKey,
      locale: updated.locale,
      content: updated.content,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
    };
  });
}
