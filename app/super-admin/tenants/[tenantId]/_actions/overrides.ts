'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import {
  addTenantFeatureKill,
  deleteTenantPriceOverride,
  removeTenantFeatureKill,
  upsertTenantPriceOverride,
} from '@/platform/super-admin/tenants/overrides';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function actorEnvelope() {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  return {
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    ip: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  };
}

export async function savePriceOverrideAction(formData: FormData): Promise<void> {
  const actor = await actorEnvelope();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const monthlyRaw = String(formData.get('monthlyPriceUsd') ?? '').trim();
  const reasonRaw = String(formData.get('reason') ?? '').trim();
  const expiresRaw = String(formData.get('effectiveUntil') ?? '').trim();
  const monthlyPriceUsd = Number.parseFloat(monthlyRaw);
  if (!tenantId || !Number.isFinite(monthlyPriceUsd) || monthlyPriceUsd < 0) {
    throw new Error('invalid form');
  }
  const reason = reasonRaw ? reasonRaw.slice(0, 500) : null;
  const effectiveUntil = expiresRaw ? new Date(expiresRaw) : null;
  if (effectiveUntil && Number.isNaN(effectiveUntil.getTime())) {
    throw new Error('invalid effectiveUntil');
  }

  await upsertTenantPriceOverride({
    tenantId,
    monthlyPriceUsd,
    reason,
    effectiveUntil,
    ...actor,
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/overrides`);
}

export async function removePriceOverrideAction(formData: FormData): Promise<void> {
  const actor = await actorEnvelope();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  if (!tenantId) throw new Error('invalid form');

  await deleteTenantPriceOverride({
    tenantId,
    actorClerkId: actor.actorClerkId,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/overrides`);
}

export async function addFeatureKillAction(formData: FormData): Promise<void> {
  const actor = await actorEnvelope();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const featureKey = String(formData.get('featureKey') ?? '')
    .trim()
    .slice(0, 128);
  const reasonRaw = String(formData.get('reason') ?? '').trim();
  if (!tenantId || !featureKey) throw new Error('invalid form');

  await addTenantFeatureKill({
    tenantId,
    featureKey,
    reason: reasonRaw ? reasonRaw.slice(0, 500) : null,
    ...actor,
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/overrides`);
}

export async function removeFeatureKillAction(formData: FormData): Promise<void> {
  const actor = await actorEnvelope();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const featureKey = String(formData.get('featureKey') ?? '').trim();
  if (!tenantId || !featureKey) throw new Error('invalid form');

  await removeTenantFeatureKill({
    tenantId,
    featureKey,
    actorClerkId: actor.actorClerkId,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/overrides`);
}
