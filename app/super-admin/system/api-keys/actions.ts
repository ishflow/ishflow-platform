'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revokeApiKey } from '@/platform/super-admin/system/api-keys';

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const apiKeyId = String(formData.get('apiKeyId') ?? '').trim();
  if (!apiKeyId) throw new Error('missing apiKeyId');
  const h = await headers();

  const before = await withBypass((tx) => tx.apiKey.findUnique({ where: { id: apiKeyId } }));
  if (!before || before.revokedAt) return;

  await revokeApiKey(apiKeyId);

  await withBypass((tx) =>
    tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: 'apikey.revoked',
        tenantId: before.tenantId,
        before: { id: before.id, name: before.name, scope: before.scope, revokedAt: null } as never,
        after: {
          id: before.id,
          name: before.name,
          scope: before.scope,
          revokedAt: new Date().toISOString(),
        } as never,
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    }),
  );

  revalidatePath('/super-admin/system/api-keys');
}
