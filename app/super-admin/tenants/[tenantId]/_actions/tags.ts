'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { createTenantTag, deleteTenantTag } from '@/platform/super-admin/tenants/tags';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const COLORS = new Set([
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

function isColor(v: string): boolean {
  return COLORS.has(v);
}

export async function addTagAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const label = String(formData.get('label') ?? '')
    .trim()
    .slice(0, 64);
  const colorRaw = String(formData.get('color') ?? 'zinc').trim();
  const color = isColor(colorRaw) ? colorRaw : 'zinc';
  if (!tenantId || !label) throw new Error('invalid form');

  await createTenantTag({
    tenantId,
    label,
    color,
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    ip: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/tags`);
  revalidatePath(`/super-admin/tenants/${tenantId}/overview`);
}

export async function removeTagAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const tagId = String(formData.get('tagId') ?? '').trim();
  if (!tenantId || !tagId) throw new Error('invalid form');

  await deleteTenantTag({
    tenantId,
    tagId,
    actorClerkId: ctx.user.clerkId,
    ip: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/tags`);
  revalidatePath(`/super-admin/tenants/${tenantId}/overview`);
}
