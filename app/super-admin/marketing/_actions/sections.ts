'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { findSection, isMarketingEditorLocale } from '@/platform/marketing/section-catalog';
import { SECTION_SCHEMAS, isSectionType } from '@/platform/marketing/section-schemas';
import {
  restoreMarketingSectionVersion,
  upsertMarketingSection,
} from '@/platform/super-admin/marketing';
import { revalidatePath, updateTag } from 'next/cache';
import { headers } from 'next/headers';

/**
 * Persist the edit + write a version snapshot + emit a platform audit log.
 * Public marketing routes are invalidated immediately so the next request
 * sees the new content.
 */
export async function upsertSection(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();

  const pageKey = String(formData.get('pageKey') ?? '');
  const sectionKey = String(formData.get('sectionKey') ?? '');
  const locale = String(formData.get('locale') ?? '');
  const contentRaw = String(formData.get('content') ?? '');

  const section = findSection(pageKey, sectionKey);
  if (!section || !isSectionType(section.type)) {
    throw new Error('Unknown section');
  }
  if (!isMarketingEditorLocale(locale)) {
    throw new Error('Unsupported locale');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(contentRaw);
  } catch {
    throw new Error('Invalid section content (not JSON)');
  }
  const schema = SECTION_SCHEMAS[section.type];
  const validated = schema.parse(parsedJson);

  await upsertMarketingSection({
    pageKey,
    sectionKey,
    locale,
    content: validated as Parameters<typeof upsertMarketingSection>[0]['content'],
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for'),
    actorUserAgent: h.get('user-agent'),
  });

  revalidatePath(`/super-admin/marketing/sections/${pageKey}/${sectionKey}`);
  revalidatePath('/super-admin/marketing/sections');
  updateTag('marketing-section');
  // Public marketing routes — invalidate every locale variant.
  revalidatePath('/[locale]', 'layout');
}

export async function restoreSectionVersion(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const versionId = String(formData.get('versionId') ?? '');
  const pageKey = String(formData.get('pageKey') ?? '');
  const sectionKey = String(formData.get('sectionKey') ?? '');
  if (!versionId) throw new Error('versionId is required');
  await restoreMarketingSectionVersion({
    versionId,
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for'),
    actorUserAgent: h.get('user-agent'),
  });
  if (pageKey && sectionKey) {
    revalidatePath(`/super-admin/marketing/sections/${pageKey}/${sectionKey}`);
    revalidatePath(`/super-admin/marketing/sections/${pageKey}/${sectionKey}/versions`);
  }
  updateTag('marketing-section');
  revalidatePath('/[locale]', 'layout');
}
