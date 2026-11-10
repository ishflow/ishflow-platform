'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

interface UserLookup {
  id: string;
  clerkId: string;
  email: string;
}

async function loadUserOrFail(userId: string): Promise<UserLookup> {
  const user = await withBypass((tx) =>
    tx.user.findUnique({
      where: { id: userId },
      select: { id: true, clerkId: true, email: true },
    }),
  );
  if (!user) throw new Error('user_not_found');
  return user;
}

async function requestContext() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}

/**
 * Generate a one-time Clerk sign-in token the operator can forward to the
 * user. Clerk does not expose a "send password reset email" endpoint via
 * the backend SDK, so we issue a 15-minute sign-in token instead. The URL
 * is recorded in the audit `after` payload and returned to the caller so
 * the SA console can show it for copy-paste.
 */
export async function requestPasswordReset(
  userId: string,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  try {
    const ctx = await assertSuperAdmin();
    const user = await loadUserOrFail(userId);
    const reqCtx = await requestContext();

    const clerk = await clerkClient();
    const token = await clerk.signInTokens.createSignInToken({
      userId: user.clerkId,
      expiresInSeconds: 60 * 15,
    });
    const url = token.url ?? null;

    await withBypass((tx) =>
      tx.platformAuditLog.create({
        data: {
          actorClerkId: ctx.user.clerkId,
          action: 'user.password_reset_sent',
          targetUserId: user.id,
          before: Prisma.JsonNull,
          after: { tokenId: token.id, url, expiresInSeconds: 60 * 15, email: user.email },
          ip: reqCtx.ip,
          userAgent: reqCtx.userAgent,
        },
      }),
    );

    revalidatePath(`/super-admin/users/${userId}`);
    return { ok: true, url: url ?? undefined };
  } catch (err) {
    console.error('[super-admin] requestPasswordReset failed', err);
    return { ok: false, message: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/**
 * Revoke every active Clerk session for the user. Continues on individual
 * session failures and reports the count of successfully revoked sessions
 * in the audit log.
 */
export async function revokeAllSessions(
  userId: string,
): Promise<{ ok: boolean; revoked: number; message?: string }> {
  try {
    const ctx = await assertSuperAdmin();
    const user = await loadUserOrFail(userId);
    const reqCtx = await requestContext();

    const clerk = await clerkClient();
    const list = await clerk.sessions.getSessionList({ userId: user.clerkId });
    const raw = Array.isArray(list) ? list : (list?.data ?? []);
    const active = raw.filter((s) => s.status === 'active');

    let revoked = 0;
    const failed: string[] = [];
    for (const s of active) {
      try {
        await clerk.sessions.revokeSession(s.id);
        revoked += 1;
      } catch (sessErr) {
        failed.push(s.id);
        console.error('[super-admin] revokeSession failed', s.id, sessErr);
      }
    }

    await withBypass((tx) =>
      tx.platformAuditLog.create({
        data: {
          actorClerkId: ctx.user.clerkId,
          action: 'user.sessions_revoked',
          targetUserId: user.id,
          before: { activeSessions: active.length },
          after: { revoked, failed },
          ip: reqCtx.ip,
          userAgent: reqCtx.userAgent,
        },
      }),
    );

    revalidatePath(`/super-admin/users/${userId}`);
    return { ok: true, revoked };
  } catch (err) {
    console.error('[super-admin] revokeAllSessions failed', err);
    return {
      ok: false,
      revoked: 0,
      message: err instanceof Error ? err.message : 'unknown_error',
    };
  }
}

/**
 * Revoke a single Clerk session by id. Used by the per-row Revoke button.
 */
export async function revokeOneSession(
  userId: string,
  sessionId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await assertSuperAdmin();
    const user = await loadUserOrFail(userId);
    const reqCtx = await requestContext();

    const clerk = await clerkClient();
    await clerk.sessions.revokeSession(sessionId);

    await withBypass((tx) =>
      tx.platformAuditLog.create({
        data: {
          actorClerkId: ctx.user.clerkId,
          action: 'user.session_revoked',
          targetUserId: user.id,
          before: Prisma.JsonNull,
          after: { sessionId },
          ip: reqCtx.ip,
          userAgent: reqCtx.userAgent,
        },
      }),
    );

    revalidatePath(`/super-admin/users/${userId}`);
    return { ok: true };
  } catch (err) {
    console.error('[super-admin] revokeOneSession failed', err);
    return { ok: false, message: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/**
 * Soft-delete a user — set `User.deletedAt`. Memberships are preserved so
 * downstream audit / billing references remain intact. Clerk identity is
 * untouched (use Clerk dashboard to fully purge if required).
 */
export async function softDeleteUser(userId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await assertSuperAdmin();
    const user = await loadUserOrFail(userId);
    const reqCtx = await requestContext();

    const now = new Date();
    await withBypass(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: user.id },
        select: { deletedAt: true },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { deletedAt: now },
      });
      await tx.platformAuditLog.create({
        data: {
          actorClerkId: ctx.user.clerkId,
          action: 'user.soft_deleted',
          targetUserId: user.id,
          before: { deletedAt: before?.deletedAt ?? null },
          after: { deletedAt: now.toISOString(), email: user.email },
          ip: reqCtx.ip,
          userAgent: reqCtx.userAgent,
        },
      });
    });

    revalidatePath(`/super-admin/users/${userId}`);
    revalidatePath('/super-admin/users');
    return { ok: true };
  } catch (err) {
    console.error('[super-admin] softDeleteUser failed', err);
    return { ok: false, message: err instanceof Error ? err.message : 'unknown_error' };
  }
}
