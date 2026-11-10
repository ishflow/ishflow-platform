'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { DeleteAccountError, deleteUserAccount } from '@/platform/auth/delete-account';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const userIdSchema = z.object({ userId: z.string().uuid() });

/**
 * Soft-delete a user via V1's `deleteUserAccount`. Scrubs PII, sets
 * deletedAt, removes memberships, and best-effort deletes the Clerk user.
 * Refuses if the user is sole `owner` of any tenant — operator must
 * transfer ownership first.
 *
 * Wraps DeleteAccountError into a string error so the client gets a
 * predictable message ('user_op:sole_owner_of_tenants' etc.).
 */
export async function softDelete(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const parsed = userIdSchema.safeParse({
    userId: String(formData.get('userId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { userId } = parsed.data;

  // Snapshot for audit BEFORE the soft-delete tombstones the row.
  const before = await withBypass(async (tx) =>
    tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, clerkId: true, firstName: true, lastName: true },
    }),
  );

  try {
    await deleteUserAccount({ userId });
  } catch (err) {
    if (err instanceof DeleteAccountError) {
      throw new Error(`user_op:${err.code}`);
    }
    throw err as Error;
  }

  await withBypass(async (tx) => {
    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'user.soft_deleted',
      tenantId: null,
      targetUserId: userId,
      before: before as unknown as Record<string, unknown>,
      after: null,
    });
  });

  revalidatePath(`/super-admin/users/${userId}`);
  revalidatePath('/super-admin/users');
}
