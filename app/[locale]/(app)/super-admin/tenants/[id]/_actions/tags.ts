'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const TAG_COLORS = new Set([
  'zinc',
  'slate',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]);

const addSchema = z.object({
  tenantId: z.string().uuid(),
  label: z.string().trim().min(1).max(64),
  color: z
    .string()
    .trim()
    .default('zinc')
    .refine((v) => TAG_COLORS.has(v), { message: 'invalid color' }),
});

const removeSchema = z.object({
  tenantId: z.string().uuid(),
  tagId: z.string().uuid(),
});

function parseAdd(formData: FormData) {
  const parsed = addSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    label: String(formData.get('label') ?? ''),
    color: String(formData.get('color') ?? 'zinc') || 'zinc',
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  return parsed.data;
}

function parseRemove(formData: FormData) {
  const parsed = removeSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    tagId: String(formData.get('tagId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  return parsed.data;
}

export async function addTag(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, label, color } = parseAdd(formData);

  await withBypass(async (tx) => {
    const before = await tx.tenantTag.findUnique({
      where: { tenantId_label: { tenantId, label } },
    });
    if (before) return; // idempotent: tag already exists

    const after = await tx.tenantTag.create({
      data: { tenantId, label, color, createdBy: ctx.user.id },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'tag.added',
      tenantId,
      before: null,
      after,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/tags`);
}

export async function removeTag(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, tagId } = parseRemove(formData);

  await withBypass(async (tx) => {
    const before = await tx.tenantTag.findUnique({ where: { id: tagId } });
    if (!before || before.tenantId !== tenantId) return;

    await tx.tenantTag.delete({ where: { id: tagId } });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'tag.removed',
      tenantId,
      before,
      after: null,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/tags`);
}
