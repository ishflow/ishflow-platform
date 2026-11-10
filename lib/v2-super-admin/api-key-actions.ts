'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revokeApiKey } from '@/platform/super-admin/system/api-keys';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const revokeSchema = z.object({ apiKeyId: z.string().uuid() });

/**
 * Revoke an API key by setting revokedAt = now. Wraps the V1 backend
 * (platform/super-admin/system/api-keys.ts) which is a single Prisma
 * update — audit is written separately here so the V1 helper stays
 * mutation-only and can be reused outside the super-admin context.
 */
export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const parsed = revokeSchema.safeParse({
    apiKeyId: String(formData.get('apiKeyId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { apiKeyId } = parsed.data;

  const before = await withBypass(async (tx) =>
    tx.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { id: true, tenantId: true, name: true, keyPrefix: true, revokedAt: true },
    }),
  );
  if (!before) {
    throw new Error('api_key_op:not_found');
  }
  if (before.revokedAt) {
    throw new Error('api_key_op:already_revoked');
  }

  await revokeApiKey(apiKeyId);

  await withBypass(async (tx) => {
    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'api_key.revoked',
      tenantId: before.tenantId,
      before,
      after: { revokedAt: new Date().toISOString() },
    });
  });

  revalidatePath('/super-admin/system/api-keys');
}
