'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { ADDON_KEYS, type AddonKey, isAddonKey } from '@/platform/addons';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const baseSchema = z.object({
  tenantId: z.string().uuid(),
  addonKey: z.string().refine(isAddonKey, {
    message: `addonKey must be one of: ${ADDON_KEYS.join(', ')}`,
  }),
});

function parse(formData: FormData) {
  const parsed = baseSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    addonKey: String(formData.get('addonKey') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  return parsed.data as { tenantId: string; addonKey: AddonKey };
}

export async function enableAddon(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, addonKey } = parse(formData);

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
      },
      update: {
        enabledBy: ctx.user.id,
        enabledAt: new Date(),
      },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: before ? 'addon.updated' : 'addon.enabled',
      tenantId,
      before,
      after,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/addons`);
}

export async function disableAddon(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, addonKey } = parse(formData);

  await withBypass(async (tx) => {
    const before = await tx.tenantAddon.findUnique({
      where: { tenantId_addonKey: { tenantId, addonKey } },
    });
    if (!before) return;

    await tx.tenantAddon.delete({
      where: { tenantId_addonKey: { tenantId, addonKey } },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'addon.disabled',
      tenantId,
      before,
      after: null,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/addons`);
}
