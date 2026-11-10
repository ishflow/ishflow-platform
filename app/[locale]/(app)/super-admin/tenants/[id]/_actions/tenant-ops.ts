'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import {
  TenantOpError,
  archiveTenant,
  hardDeleteTenant,
  liftTenantSuspension,
  suspendTenant,
  transferTenantOwnership,
  wipeTenantData,
} from '@/platform/super-admin/tenants/tenant-ops';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const suspendSchema = z.object({
  tenantId: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
});

const onlyTenantSchema = z.object({ tenantId: z.string().uuid() });

async function actor() {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  return {
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    ip: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  };
}

function bubble(err: unknown): never {
  if (err instanceof TenantOpError) throw new Error(`tenant_op:${err.code}`);
  throw err as Error;
}

function revalidate(tenantId: string): void {
  revalidatePath(`/super-admin/tenants/${tenantId}`);
  revalidatePath(`/super-admin/tenants/${tenantId}/timeline`);
  revalidatePath('/super-admin/tenants');
}

export async function suspend(formData: FormData): Promise<void> {
  const parsed = suspendSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  try {
    await suspendTenant({ ...parsed.data, ...(await actor()) });
  } catch (err) {
    bubble(err);
  }
  revalidate(parsed.data.tenantId);
}

export async function liftSuspension(formData: FormData): Promise<void> {
  const parsed = onlyTenantSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
  });
  if (!parsed.success) throw new Error('invalid tenantId');
  try {
    await liftTenantSuspension({ tenantId: parsed.data.tenantId, ...(await actor()) });
  } catch (err) {
    bubble(err);
  }
  revalidate(parsed.data.tenantId);
}

export async function archive(formData: FormData): Promise<void> {
  const parsed = onlyTenantSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
  });
  if (!parsed.success) throw new Error('invalid tenantId');
  try {
    await archiveTenant({ tenantId: parsed.data.tenantId, ...(await actor()) });
  } catch (err) {
    bubble(err);
  }
  revalidate(parsed.data.tenantId);
}

const transferSchema = z.object({
  tenantId: z.string().uuid(),
  newOwnerUserId: z.string().uuid(),
});

export async function transferOwnership(formData: FormData): Promise<void> {
  const parsed = transferSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    newOwnerUserId: String(formData.get('newOwnerUserId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  try {
    await transferTenantOwnership({ ...parsed.data, ...(await actor()) });
  } catch (err) {
    bubble(err);
  }
  revalidate(parsed.data.tenantId);
  revalidatePath(`/super-admin/tenants/${parsed.data.tenantId}/users`);
}

const slugConfirmSchema = z.object({
  tenantId: z.string().uuid(),
  confirmSlug: z.string().min(1),
});

export async function hardDelete(formData: FormData): Promise<void> {
  const parsed = slugConfirmSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    confirmSlug: String(formData.get('confirmSlug') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  // Honor the 30-day archived window by default. Only skip it when the
  // operator explicitly opts in (a deliberate "force delete"). This was
  // previously hardcoded `true`, which let a live, non-archived tenant be
  // permanently deleted (full cascade) with only a slug confirmation.
  const bypassWindow =
    formData.get('bypassWindow') === 'true' || formData.get('bypassWindow') === 'on';
  try {
    await hardDeleteTenant({
      tenantId: parsed.data.tenantId,
      confirmSlug: parsed.data.confirmSlug,
      bypassWindow,
      ...(await actor()),
    });
  } catch (err) {
    bubble(err);
  }
  // Tenant row gone — only revalidate the list (detail will 404 on next visit).
  revalidatePath('/super-admin/tenants');
}

export async function wipeData(formData: FormData): Promise<void> {
  const parsed = slugConfirmSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    confirmSlug: String(formData.get('confirmSlug') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  try {
    await wipeTenantData({ ...parsed.data, ...(await actor()) });
  } catch (err) {
    bubble(err);
  }
  revalidate(parsed.data.tenantId);
  revalidatePath(`/super-admin/tenants/${parsed.data.tenantId}/documents`);
}
