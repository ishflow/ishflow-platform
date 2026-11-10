'use server';

import {
  DEV_BYPASS_TENANT_COOKIE,
  DEV_BYPASS_USER_COOKIE,
  isDevAuthBypassActive,
} from '@/platform/auth/dev-bypass';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const UUID_OR_EMPTY = z.union([z.string().uuid(), z.literal('')]);

const setSchema = z.object({
  tenantId: UUID_OR_EMPTY,
  userId: UUID_OR_EMPTY,
});

/**
 * Set the dev-bypass impersonation cookies. Empty values clear the cookie
 * (revert to defaults). Triple-guarded against accidental prod execution:
 * the underlying dev-bypass module already refuses to act when
 * NODE_ENV=production OR DEV_AUTH_BYPASS is unset.
 */
export async function setImpersonation(formData: FormData): Promise<void> {
  if (!isDevAuthBypassActive()) {
    throw new Error('dev bypass not active');
  }
  const parsed = setSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    userId: String(formData.get('userId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { tenantId, userId } = parsed.data;
  const jar = await cookies();
  // 7-day persistence; secure flag off because dev is localhost-only.
  const opts = { httpOnly: false, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7 };
  if (tenantId) jar.set(DEV_BYPASS_TENANT_COOKIE, tenantId, opts);
  else jar.delete(DEV_BYPASS_TENANT_COOKIE);
  if (userId) jar.set(DEV_BYPASS_USER_COOKIE, userId, opts);
  else jar.delete(DEV_BYPASS_USER_COOKIE);
  revalidatePath('/');
  redirect('/dashboard');
}

export async function clearImpersonation(): Promise<void> {
  if (!isDevAuthBypassActive()) {
    throw new Error('dev bypass not active');
  }
  const jar = await cookies();
  jar.delete(DEV_BYPASS_TENANT_COOKIE);
  jar.delete(DEV_BYPASS_USER_COOKIE);
  revalidatePath('/');
  redirect('/dev/impersonate');
}
