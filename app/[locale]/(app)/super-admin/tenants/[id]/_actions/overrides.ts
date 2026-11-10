'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const featureKillSchema = z.object({
  tenantId: z.string().uuid(),
  featureKey: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9_.-]+$/i, 'featureKey: alphanumeric/_/-/. only'),
  reason: z.string().trim().max(500).optional(),
});

const removeFeatureKillSchema = z.object({
  tenantId: z.string().uuid(),
  featureKey: z.string().trim().min(1).max(128),
});

const priceOverrideSchema = z.object({
  tenantId: z.string().uuid(),
  monthlyPriceUsd: z.coerce.number().nonnegative().max(100_000),
  reason: z.string().trim().max(500).optional(),
  effectiveUntil: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? new Date(v) : null)),
});

const removePriceSchema = z.object({ tenantId: z.string().uuid() });

function parse<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.infer<S> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  return parsed.data;
}

export async function addFeatureKill(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, featureKey, reason } = parse(featureKillSchema, {
    tenantId: String(formData.get('tenantId') ?? ''),
    featureKey: String(formData.get('featureKey') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });

  await withBypass(async (tx) => {
    const before = await tx.tenantFeatureKill.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } },
    });
    if (before) return;

    const after = await tx.tenantFeatureKill.create({
      data: { tenantId, featureKey, reason: reason ?? null, killedBy: ctx.user.id },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'feature_kill.added',
      tenantId,
      before: null,
      after,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/overrides`);
}

export async function removeFeatureKill(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, featureKey } = parse(removeFeatureKillSchema, {
    tenantId: String(formData.get('tenantId') ?? ''),
    featureKey: String(formData.get('featureKey') ?? ''),
  });

  await withBypass(async (tx) => {
    const before = await tx.tenantFeatureKill.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } },
    });
    if (!before) return;

    await tx.tenantFeatureKill.delete({
      where: { tenantId_featureKey: { tenantId, featureKey } },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'feature_kill.removed',
      tenantId,
      before,
      after: null,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/overrides`);
}

export async function savePriceOverride(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, monthlyPriceUsd, reason, effectiveUntil } = parse(priceOverrideSchema, {
    tenantId: String(formData.get('tenantId') ?? ''),
    monthlyPriceUsd: String(formData.get('monthlyPriceUsd') ?? ''),
    reason: String(formData.get('reason') ?? ''),
    effectiveUntil: String(formData.get('effectiveUntil') ?? ''),
  });

  await withBypass(async (tx) => {
    const before = await tx.tenantPriceOverride.findUnique({ where: { tenantId } });
    const after = await tx.tenantPriceOverride.upsert({
      where: { tenantId },
      create: {
        tenantId,
        monthlyPriceUsd,
        reason: reason ?? null,
        effectiveUntil,
        createdBy: ctx.user.id,
      },
      update: {
        monthlyPriceUsd,
        reason: reason ?? null,
        effectiveUntil,
        createdBy: ctx.user.id,
      },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: before ? 'price_override.updated' : 'price_override.added',
      tenantId,
      before,
      after,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/overrides`);
}

export async function removePriceOverride(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId } = parse(removePriceSchema, {
    tenantId: String(formData.get('tenantId') ?? ''),
  });

  await withBypass(async (tx) => {
    const before = await tx.tenantPriceOverride.findUnique({ where: { tenantId } });
    if (!before) return;

    await tx.tenantPriceOverride.delete({ where: { tenantId } });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'price_override.removed',
      tenantId,
      before,
      after: null,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/overrides`);
}
