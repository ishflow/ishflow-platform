'use server';

/**
 * Server actions for the Super Admin Communications composer.
 *
 * Every write goes through `assertSuperAdmin()` and writes a
 * `PlatformAuditLog` row alongside the mutation inside a single
 * `withBypass` transaction. `internalKey` is unique — duplicate
 * submissions return a friendly error.
 */
import { type AnnouncementStatus, type AnnouncementSurface, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';

const SURFACES: AnnouncementSurface[] = ['banner', 'popup', 'feed_only'];
const STATUSES: AnnouncementStatus[] = ['draft', 'scheduled', 'live', 'archived'];

function csv(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new Error('invalid date');
  return d;
}

function buildTargeting(formData: FormData): Prisma.InputJsonValue {
  const obj: Record<string, string[]> = {};
  const plans = csv(String(formData.get('plans') ?? ''));
  const addons = csv(String(formData.get('addons') ?? ''));
  const roles = csv(String(formData.get('roles') ?? ''));
  const locales = csv(String(formData.get('locales') ?? ''));
  const tenantIds = csv(String(formData.get('tenantIds') ?? ''));
  if (plans.length) obj.plans = plans;
  if (addons.length) obj.addons = addons;
  if (roles.length) obj.roles = roles;
  if (locales.length) obj.locales = locales;
  if (tenantIds.length) obj.tenantIds = tenantIds;
  return obj as Prisma.InputJsonValue;
}

interface TranslationInput {
  locale: string;
  title: string;
  body: string;
}

function collectTranslations(formData: FormData): TranslationInput[] {
  const out: TranslationInput[] = [];
  // Form sends repeating triples: translations[<locale>][title|body].
  const seen = new Set<string>();
  for (const [key] of formData.entries()) {
    const match = key.match(/^translations\[(.+?)\]\[(title|body)\]$/);
    if (!match) continue;
    const locale = match[1] as string;
    if (seen.has(locale)) continue;
    seen.add(locale);
    const title = String(formData.get(`translations[${locale}][title]`) ?? '').trim();
    const body = String(formData.get(`translations[${locale}][body]`) ?? '').trim();
    if (!title && !body) continue;
    out.push({ locale, title, body });
  }
  return out;
}

const internalKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-_]*$/, 'lowercase letters, digits, _ and - only');

function readSurface(raw: string): AnnouncementSurface {
  if (!(SURFACES as string[]).includes(raw)) throw new Error(`invalid surface: ${raw}`);
  return raw as AnnouncementSurface;
}

function readStatus(raw: string): AnnouncementStatus {
  if (!(STATUSES as string[]).includes(raw)) throw new Error(`invalid status: ${raw}`);
  return raw as AnnouncementStatus;
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  actorClerkId: string,
  action: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  const h = await headers();
  await tx.platformAuditLog.create({
    data: {
      actorClerkId,
      action,
      before:
        before === null || before === undefined
          ? Prisma.JsonNull
          : (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue),
      after:
        after === null || after === undefined
          ? Prisma.JsonNull
          : (JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue),
      ip: h.get('x-forwarded-for') ?? null,
      userAgent: h.get('user-agent') ?? null,
    },
  });
}

async function snapshotAnnouncement(tx: Prisma.TransactionClient, id: string): Promise<unknown> {
  const a = await tx.marketingAnnouncement.findUnique({
    where: { id },
    include: { translations: true },
  });
  return a;
}

export async function createAnnouncement(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();

  const internalKey = internalKeySchema.parse(String(formData.get('internalKey') ?? '').trim());
  const surface = readSurface(String(formData.get('surface') ?? ''));
  const status = readStatus(String(formData.get('status') ?? 'draft'));
  const startAt = parseDate(String(formData.get('startAt') ?? ''));
  const endAt = parseDate(String(formData.get('endAt') ?? ''));
  const dismissible = formData.get('dismissible') === 'on';
  const ctaLabel = String(formData.get('ctaLabel') ?? '').trim() || null;
  const ctaUrl = String(formData.get('ctaUrl') ?? '').trim() || null;
  const targeting = buildTargeting(formData);
  const translations = collectTranslations(formData);

  let createdId: string | null = null;

  await withBypass(async (tx) => {
    const created = await tx.marketingAnnouncement.create({
      data: {
        internalKey,
        surface,
        status,
        startAt,
        endAt,
        dismissible,
        ctaLabel,
        ctaUrl,
        targeting,
        createdBy: ctx.user.id,
        translations:
          translations.length > 0
            ? {
                create: translations.map((t) => ({
                  locale: t.locale,
                  title: t.title,
                  body: t.body,
                })),
              }
            : undefined,
      },
    });
    createdId = created.id;
    await writeAudit(tx, ctx.user.clerkId, 'announcement.created', null, created);
  });

  revalidatePath('/super-admin/communications');
  if (createdId) redirect(`/super-admin/communications/${createdId}`);
}

export async function updateAnnouncement(id: string, formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();

  const internalKey = internalKeySchema.parse(String(formData.get('internalKey') ?? '').trim());
  const surface = readSurface(String(formData.get('surface') ?? ''));
  const status = readStatus(String(formData.get('status') ?? 'draft'));
  const startAt = parseDate(String(formData.get('startAt') ?? ''));
  const endAt = parseDate(String(formData.get('endAt') ?? ''));
  const dismissible = formData.get('dismissible') === 'on';
  const ctaLabel = String(formData.get('ctaLabel') ?? '').trim() || null;
  const ctaUrl = String(formData.get('ctaUrl') ?? '').trim() || null;
  const targeting = buildTargeting(formData);
  const translations = collectTranslations(formData);

  await withBypass(async (tx) => {
    const before = await snapshotAnnouncement(tx, id);
    if (!before) throw new Error('announcement not found');

    await tx.marketingAnnouncement.update({
      where: { id },
      data: {
        internalKey,
        surface,
        status,
        startAt,
        endAt,
        dismissible,
        ctaLabel,
        ctaUrl,
        targeting,
      },
    });

    // Replace translations wholesale (small set, simpler than per-row diff).
    await tx.marketingAnnouncementTranslation.deleteMany({ where: { announcementId: id } });
    if (translations.length > 0) {
      await tx.marketingAnnouncementTranslation.createMany({
        data: translations.map((t) => ({
          announcementId: id,
          locale: t.locale,
          title: t.title,
          body: t.body,
        })),
      });
    }

    const after = await snapshotAnnouncement(tx, id);
    await writeAudit(tx, ctx.user.clerkId, 'announcement.updated', before, after);
  });

  revalidatePath('/super-admin/communications');
  revalidatePath(`/super-admin/communications/${id}`);
}

export async function publishAnnouncement(id: string): Promise<void> {
  const ctx = await assertSuperAdmin();

  await withBypass(async (tx) => {
    const before = await snapshotAnnouncement(tx, id);
    if (!before) throw new Error('announcement not found');

    const updated = await tx.marketingAnnouncement.update({
      where: { id },
      data: { status: 'live' },
      include: { translations: true },
    });

    await tx.marketingAnnouncementVersion.create({
      data: {
        announcementId: id,
        snapshot: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
        createdBy: ctx.user.id,
      },
    });

    await writeAudit(tx, ctx.user.clerkId, 'announcement.published', before, updated);
  });

  revalidatePath('/super-admin/communications');
  revalidatePath(`/super-admin/communications/${id}`);
}

export async function recallAnnouncement(id: string): Promise<void> {
  const ctx = await assertSuperAdmin();

  await withBypass(async (tx) => {
    const before = await snapshotAnnouncement(tx, id);
    if (!before) throw new Error('announcement not found');

    const now = new Date();
    const updated = await tx.marketingAnnouncement.update({
      where: { id },
      data: { status: 'archived', endAt: now },
    });

    await writeAudit(tx, ctx.user.clerkId, 'announcement.recalled', before, updated);
  });

  revalidatePath('/super-admin/communications');
  revalidatePath(`/super-admin/communications/${id}`);
}
