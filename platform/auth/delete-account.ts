import { withBypass } from '@/platform/db/tenant-context';
import { clerkClient } from '@clerk/nextjs/server';

export type DeleteAccountErrorCode = 'sole_owner_of_tenants' | 'user_not_found';

/**
 * Errors raised by `deleteUserAccount`. `tenantIds` is populated only for the
 * `sole_owner_of_tenants` code so the caller can surface the blocking workspace
 * ids to the client (mobile shows a "transfer ownership first" sheet).
 */
export class DeleteAccountError extends Error {
  constructor(
    public readonly code: DeleteAccountErrorCode,
    message: string,
    public readonly tenantIds: string[] = [],
  ) {
    super(message);
    this.name = 'DeleteAccountError';
  }

  static soleOwnerOfTenants(tenantIds: string[]): DeleteAccountError {
    return new DeleteAccountError(
      'sole_owner_of_tenants',
      `User is sole owner of ${tenantIds.length} tenant(s)`,
      tenantIds,
    );
  }

  static userNotFound(userId: string): DeleteAccountError {
    return new DeleteAccountError('user_not_found', `User ${userId} not found or already deleted.`);
  }
}

export interface DeleteUserAccountInput {
  userId: string;
}

export interface DeleteUserAccountResult {
  deletedAt: Date;
}

/**
 * Build the tombstone email written into `user.email` on soft-delete.
 * `user.email` is `UNIQUE NOT NULL` so we cannot literally null it — we rewrite
 * to a deterministic deleted-<id>@deleted.local sentinel that preserves the
 * unique constraint while making the row trivially identifiable as a tombstone.
 */
export function buildTombstoneEmail(userId: string): string {
  return `deleted-${userId}@deleted.local`;
}

/**
 * Soft-delete the user account:
 *  1. Inside `withBypass`, refuse if user is the sole `owner` of any workspace
 *     (caller must transfer ownership first).
 *  2. Scrub PII (firstName/lastName/imageUrl → null, email → tombstone) and set
 *     `deletedAt`. `clerkId` is preserved so the row remains correlated with
 *     audit logs and the Clerk side of the world.
 *  3. Hard-delete all memberships for the user.
 *  4. Best-effort Clerk user delete (failure is logged but not fatal — the DB
 *     row is the source of truth for our auth checks; a stranded Clerk user
 *     just means the user can re-sign-in and we'd see a `null` ctx because the
 *     tombstone DB row no longer matches any active membership).
 */
export async function deleteUserAccount(
  input: DeleteUserAccountInput,
): Promise<DeleteUserAccountResult> {
  const { userId } = input;

  const { deletedAt, clerkId } = await withBypass(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, clerkId: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw DeleteAccountError.userNotFound(userId);
    }

    // Owner check: for each membership where this user has the `owner` role,
    // verify at least one OTHER user holds `owner` in the same tenant. If not,
    // we'd leave a tenant with zero owners — refuse.
    const memberships = await tx.membership.findMany({
      where: { userId },
      select: {
        tenantId: true,
        roles: { select: { name: true } },
      },
    });

    const soleOwnedTenantIds: string[] = [];
    for (const m of memberships) {
      const isOwner = m.roles.some((r) => r.name === 'owner');
      if (!isOwner) continue;
      const otherOwnerCount = await tx.membership.count({
        where: {
          tenantId: m.tenantId,
          userId: { not: userId },
          roles: { some: { name: 'owner' } },
        },
      });
      if (otherOwnerCount === 0) {
        soleOwnedTenantIds.push(m.tenantId);
      }
    }

    if (soleOwnedTenantIds.length > 0) {
      throw DeleteAccountError.soleOwnerOfTenants(soleOwnedTenantIds);
    }

    const now = new Date();
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        firstName: null,
        lastName: null,
        imageUrl: null,
        email: buildTombstoneEmail(userId),
      },
    });
    await tx.membership.deleteMany({ where: { userId } });

    return { deletedAt: now, clerkId: user.clerkId };
  });

  // Compensating Clerk delete — best-effort. If Clerk is down or the user was
  // already removed there, we still consider the DB-side soft-delete the
  // source of truth.
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkId);
  } catch (error) {
    console.error('[delete-account] Clerk user delete failed for', clerkId, error);
  }

  return { deletedAt };
}
