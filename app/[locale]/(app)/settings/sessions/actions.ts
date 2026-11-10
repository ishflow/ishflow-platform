'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

/** Revoke a single Clerk session by id — only if it belongs to the caller. */
export async function revokeSessionAction(sessionId: string): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId || !sessionId) return { ok: false };
  try {
    const clerk = await clerkClient();
    // Ownership check: never revoke a session that isn't the caller's own
    // (the id comes from the client — guard against IDOR).
    const result = await clerk.sessions.getSessionList({ userId });
    const list = (Array.isArray(result) ? result : (result?.data ?? [])) as Array<{ id: string }>;
    if (!list.some((s) => s.id === sessionId)) return { ok: false };
    await clerk.sessions.revokeSession(sessionId);
  } catch (err) {
    console.error('[settings:sessions] revokeSession failed', err);
    return { ok: false };
  }
  revalidatePath('/settings/sessions');
  return { ok: true };
}

/** Revoke every active session for the current user except the current one. */
export async function revokeOtherSessionsAction(): Promise<{ ok: boolean; revoked: number }> {
  const { userId, sessionId: current } = await auth();
  if (!userId) return { ok: false, revoked: 0 };
  let revoked = 0;
  try {
    const clerk = await clerkClient();
    const result = await clerk.sessions.getSessionList({ userId });
    const list = (Array.isArray(result) ? result : (result?.data ?? [])) as Array<{
      id: string;
      status: string;
    }>;
    for (const s of list) {
      if (s.id === current) continue;
      if (s.status !== 'active') continue;
      try {
        await clerk.sessions.revokeSession(s.id);
        revoked += 1;
      } catch (err) {
        console.error('[settings:sessions] revoke (bulk) failed', s.id, err);
      }
    }
  } catch (err) {
    console.error('[settings:sessions] getSessionList failed', err);
    return { ok: false, revoked };
  }
  revalidatePath('/settings/sessions');
  return { ok: true, revoked };
}
