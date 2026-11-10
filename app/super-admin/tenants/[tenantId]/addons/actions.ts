'use server';

import { ADDON_KEYS, type AddonKey, isAddonKey } from '@/platform/addons';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

function parseExpiresAt(raw: string | null): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new Error('invalid expiresAt');
  return d;
}

function readAddonKey(formData: FormData): AddonKey {
  const raw = String(formData.get('addonKey') ?? '');
  if (!isAddonKey(raw)) {
    throw new Error(`invalid addonKey: ${raw}. expected one of ${ADDON_KEYS.join(', ')}`);
  }
  return raw;
}

function readTenantId(formData: FormData): string {
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  if (!tenantId) throw new Error('missing tenantId');
  return tenantId;
}

export async function enableAddon(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const tenantId = readTenantId(formData);
  const addonKey = readAddonKey(formData);
  const expiresAt = parseExpiresAt(String(formData.get('expiresAt') ?? ''));
  const notesRaw = String(formData.get('notes') ?? '').trim();
  const notes = notesRaw.length > 0 ? notesRaw.slice(0, 1000) : null;
  const h = await headers();

  await withBypass(async (tx) => {
    const before = await tx.tenantAddon.findUnique({
      where: { tenantId_addonKey: { tenantId, addonKey } },
    });

    const after = await tx.tenantAddon.upsert({
      where: { tenantId_addonKey: { tenantId, addonKey } },
      create: {
        tenantId,
        addonKey,
        enabledBy: ctx.user.id,
        enabledAt: new Date(),
        expiresAt,
        notes,
      },
      update: {
        enabledBy: ctx.user.id,
        enabledAt: new Date(),
        expiresAt,
        notes,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: before ? 'addon.updated' : 'addon.enabled',
        tenantId,
        before: before
          ? (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        after: JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue,
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/addons`);
}

export async function disableAddon(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const tenantId = readTenantId(formData);
  const addonKey = readAddonKey(formData);
  const h = await headers();

  await withBypass(async (tx) => {
    const before = await tx.tenantAddon.findUnique({
      where: { tenantId_addonKey: { tenantId, addonKey } },
    });

    if (!before) {
      // Idempotent: nothing to disable.
      return;
    }

    await tx.tenantAddon.delete({
      where: { tenantId_addonKey: { tenantId, addonKey } },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: 'addon.disabled',
        tenantId,
        before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue,
        after: Prisma.JsonNull,
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/addons`);
}
