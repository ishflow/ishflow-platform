'use server';
import { resolveContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';
import { z } from 'zod';

const schema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(7).max(20),
});

export type CompleteProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Persist the invited worker's first/last name + contact phone on `User`.
 * The user id comes from the resolved auth context (never from the form), and
 * the write goes through `withBypass` — `User` is a platform-level table with
 * no RLS policy. Idempotent: re-submitting overwrites with the same values.
 */
export async function completeProfileAction(form: FormData): Promise<CompleteProfileResult> {
  const ctx = await resolveContext();
  if (!ctx) return { ok: false, error: 'unauthorized' };

  const parsed = schema.safeParse({
    firstName: form.get('firstName'),
    lastName: form.get('lastName'),
    phone: form.get('phone'),
  });
  if (!parsed.success) {
    const phoneIssue = parsed.error.issues.some((i) => i.path[0] === 'phone');
    return { ok: false, error: phoneIssue ? 'invalid_phone' : 'invalid_input' };
  }

  await withBypass((tx) => tx.user.update({ where: { id: ctx.user.id }, data: parsed.data }));
  return { ok: true };
}
