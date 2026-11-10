'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import {
  getRawTokenById,
} from '@/platform/super-admin/mobile/device-push-tokens';
import {
  getMinAppVersions,
  setMinAppVersion,
} from '@/platform/super-admin/mobile/min-versions';
import { sendPushToExpoTokens } from '@/platform/notifications/push';

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

export async function updateMinAppVersions(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const iosRaw = String(formData.get('ios') ?? '').trim();
  const androidRaw = String(formData.get('android') ?? '').trim();
  const ios = iosRaw.length > 0 ? iosRaw : null;
  const android = androidRaw.length > 0 ? androidRaw : null;
  const before = await getMinAppVersions();
  if (before.ios === ios && before.android === android) return;
  await Promise.all([
    setMinAppVersion('ios', ios, ctx.user.id),
    setMinAppVersion('android', android, ctx.user.id),
  ]);
  await writeAudit(
    'mobile.min_versions_updated',
    before,
    { ios, android },
    ctx,
  );
  revalidatePath('/super-admin/mobile');
}

export interface SendTestPushResult {
  ok: boolean;
  error?: string;
}

export async function sendTestPushAction(formData: FormData): Promise<SendTestPushResult> {
  const ctx = await assertSuperAdmin();
  const tokenId = String(formData.get('tokenId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim() || 'Test push';
  const body = String(formData.get('body') ?? '').trim() || 'If you can read this, push works.';
  if (!tokenId) return { ok: false, error: 'missing tokenId' };

  const rawToken = await getRawTokenById(tokenId);
  if (!rawToken) return { ok: false, error: 'token not found' };

  let result: { ok: boolean; errors: string[] };
  try {
    result = await sendPushToExpoTokens([rawToken], {
      title,
      body,
      data: { source: 'super_admin_test' },
    });
  } catch (e) {
    await writeAudit('mobile.test_push_failed', { tokenId }, { error: (e as Error).message }, ctx);
    return { ok: false, error: (e as Error).message };
  }

  if (!result.ok) {
    const error = result.errors.join('; ') || 'push rejected by Expo';
    await writeAudit('mobile.test_push_failed', { tokenId }, { errors: result.errors }, ctx);
    return { ok: false, error };
  }

  await writeAudit(
    'mobile.test_push_sent',
    null,
    { tokenId, title, body },
    ctx,
  );
  return { ok: true };
}
