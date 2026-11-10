'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import {
  getMaintenanceState,
  getReadonlyEnabled,
  setMaintenanceState,
  setReadonlyEnabled,
} from '@/platform/super-admin/system/maintenance';
import {
  deletePlatformSetting,
  getPlatformSetting,
  parseJsonValue,
  setPlatformSetting,
} from '@/platform/super-admin/system/platform-settings';

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (value === null) return false;
  const v = String(value).toLowerCase().trim();
  return v === 'on' || v === 'true' || v === '1' || v === 'yes';
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const raw = String(value).trim();
  return raw.length > 0 ? raw : null;
}

async function writeAudit(
  action: string,
  before: unknown,
  after: unknown,
  ctx: { user: { id: string; clerkId: string } },
): Promise<void> {
  const h = await headers();
  await withBypass((tx) =>
    tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action,
        before: before as never,
        after: after as never,
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    }),
  );
}

export async function updateMaintenanceMode(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const enabled = parseBoolean(formData.get('enabled'));
  const until = parseOptionalString(formData.get('until'));
  if (until) {
    const d = new Date(until);
    if (Number.isNaN(d.getTime())) throw new Error('invalid `until` timestamp');
  }
  const message = parseOptionalString(formData.get('message'));

  const before = await getMaintenanceState();
  await setMaintenanceState({ enabled, until, message }, ctx.user.id);
  const after = await getMaintenanceState();

  await writeAudit(
    enabled === before.enabled
      ? 'system.maintenance_updated'
      : enabled
        ? 'system.maintenance_on'
        : 'system.maintenance_off',
    before,
    after,
    ctx,
  );
  revalidatePath('/super-admin/system');
}

export async function updateReadonlyMode(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const enabled = parseBoolean(formData.get('enabled'));
  const before = await getReadonlyEnabled();
  if (before === enabled) return;
  await setReadonlyEnabled(enabled, ctx.user.id);
  await writeAudit(
    enabled ? 'system.readonly_on' : 'system.readonly_off',
    { enabled: before },
    { enabled },
    ctx,
  );
  revalidatePath('/super-admin/system');
}

export async function upsertPlatformSetting(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const key = String(formData.get('key') ?? '').trim();
  if (!key) throw new Error('settings.empty_key');
  const valueRaw = String(formData.get('value') ?? '');
  const parsed = parseJsonValue(valueRaw);
  if (!parsed.ok) throw new Error(`settings.invalid_json:${parsed.error}`);

  const existing = await getPlatformSetting(key);
  await setPlatformSetting(key, parsed.value, ctx.user.id);
  await writeAudit(
    existing ? 'system.setting_updated' : 'system.setting_created',
    existing ? { key, value: existing.value } : null,
    { key, value: parsed.value },
    ctx,
  );

  revalidatePath('/super-admin/system/settings');
  revalidatePath('/super-admin/system');
}

export async function deletePlatformSettingAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const key = String(formData.get('key') ?? '').trim();
  if (!key) throw new Error('settings.empty_key');
  const existing = await getPlatformSetting(key);
  if (!existing) return;
  await deletePlatformSetting(key);
  await writeAudit('system.setting_deleted', { key, value: existing.value }, null, ctx);
  revalidatePath('/super-admin/system/settings');
  revalidatePath('/super-admin/system');
}
