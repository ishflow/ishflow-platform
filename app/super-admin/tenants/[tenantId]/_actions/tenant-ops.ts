'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import {
  TenantOpError,
  archiveTenant,
  hardDeleteTenant,
  liftTenantSuspension,
  restoreTenant,
  suspendTenant,
  transferTenantOwnership,
  wipeTenantData,
} from '@/platform/super-admin/tenants/tenant-ops';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

function readTenantId(form: FormData): string {
  const v = String(form.get('tenantId') ?? '').trim();
  if (!v) throw new Error('missing tenantId');
  return v;
}

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

function rerunTenantPaths(tenantId: string): void {
  revalidatePath(`/super-admin/tenants/${tenantId}`);
  revalidatePath(`/super-admin/tenants/${tenantId}/overview`);
  revalidatePath(`/super-admin/tenants/${tenantId}/timeline`);
  revalidatePath('/super-admin/tenants');
}

function bubbleOpError(err: unknown): never {
  if (err instanceof TenantOpError) {
    throw new Error(`tenant_op:${err.code}`);
  }
  throw err as Error;
}

export async function suspendTenantAction(formData: FormData): Promise<void> {
  const tenantId = readTenantId(formData);
  const reason = String(formData.get('reason') ?? '')
    .trim()
    .slice(0, 1000);
  if (!reason) throw new Error('reason required');
  const actor = await actorEnvelope();
  try {
    await suspendTenant({ tenantId, reason, ...actor });
  } catch (err) {
    bubbleOpError(err);
  }
  rerunTenantPaths(tenantId);
}

export async function liftSuspensionAction(formData: FormData): Promise<void> {
  const tenantId = readTenantId(formData);
  const actor = await actorEnvelope();
  try {
    await liftTenantSuspension({ tenantId, ...actor });
  } catch (err) {
    bubbleOpError(err);
  }
  rerunTenantPaths(tenantId);
}

export async function archiveTenantAction(formData: FormData): Promise<void> {
  const tenantId = readTenantId(formData);
  const actor = await actorEnvelope();
  try {
    await archiveTenant({ tenantId, ...actor });
  } catch (err) {
    bubbleOpError(err);
  }
  rerunTenantPaths(tenantId);
}

export async function restoreTenantAction(formData: FormData): Promise<void> {
  const tenantId = readTenantId(formData);
  const actor = await actorEnvelope();
  try {
    await restoreTenant({ tenantId, ...actor });
  } catch (err) {
    bubbleOpError(err);
  }
  rerunTenantPaths(tenantId);
}

export async function hardDeleteTenantAction(formData: FormData): Promise<void> {
  const tenantId = readTenantId(formData);
  const confirmSlug = String(formData.get('confirmSlug') ?? '').trim();
  const bypassWindow = String(formData.get('bypassWindow') ?? '') === '1';
  if (!confirmSlug) throw new Error('confirmSlug required');
  const actor = await actorEnvelope();
  try {
    await hardDeleteTenant({ tenantId, confirmSlug, bypassWindow, ...actor });
  } catch (err) {
    bubbleOpError(err);
  }
  // Tenant no longer exists — kick the operator back to the list.
  revalidatePath('/super-admin/tenants');
}

export async function transferOwnershipAction(formData: FormData): Promise<void> {
  const tenantId = readTenantId(formData);
  const newOwnerUserId = String(formData.get('newOwnerUserId') ?? '').trim();
  if (!newOwnerUserId) throw new Error('newOwnerUserId required');
  const actor = await actorEnvelope();
  try {
    await transferTenantOwnership({ tenantId, newOwnerUserId, ...actor });
  } catch (err) {
    bubbleOpError(err);
  }
  rerunTenantPaths(tenantId);
  revalidatePath(`/super-admin/tenants/${tenantId}/users`);
}

export async function wipeTenantDataAction(formData: FormData): Promise<void> {
  const tenantId = readTenantId(formData);
  const confirmSlug = String(formData.get('confirmSlug') ?? '').trim();
  if (!confirmSlug) throw new Error('confirmSlug required');
  const actor = await actorEnvelope();
  try {
    await wipeTenantData({ tenantId, confirmSlug, ...actor });
  } catch (err) {
    bubbleOpError(err);
  }
  rerunTenantPaths(tenantId);
  revalidatePath(`/super-admin/tenants/${tenantId}/documents`);
  revalidatePath(`/super-admin/tenants/${tenantId}/debug`);
}
