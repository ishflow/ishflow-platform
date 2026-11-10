'use server';

import { requireContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';
import { setOnboardingState } from '@/platform/onboarding';
import { seedDemo } from '@/prisma/seed/runner';
import { revalidatePath } from 'next/cache';

export type LoadDemoDataResult =
  | { ok: true }
  | { ok: false; error: 'no_tenant' | 'forbidden' | 'seed_failed' };

export async function dismissOnboardingAction(): Promise<void> {
  const ctx = await requireContext();
  if (!ctx.tenant) return;
  await setOnboardingState(ctx.tenant.id, { dismissed: true });
  revalidatePath('/dashboard');
}

/**
 * Form-action wrapper around {@link loadDemoDataAction}. Returns `void` so it
 * satisfies the `<form action>` signature; errors are swallowed and surfaced
 * later via the page refresh (the dashboard re-reads progress on every render).
 */
export async function loadDemoDataFormAction(_formData?: FormData): Promise<void> {
  await loadDemoDataAction();
}

export async function loadDemoDataAction(): Promise<LoadDemoDataResult> {
  const ctx = await requireContext();
  const tenant = ctx.tenant;
  if (!tenant) return { ok: false, error: 'no_tenant' };

  // `membership.roles` is typed as RoleWithScopes (no `name`), but the
  // underlying Prisma query includes scalar fields. Mirror the cast used
  // in app/api/mobile/onboarding/seed-demo/route.ts so behaviour matches.
  const roles =
    (ctx.membership as unknown as { roles: Array<{ name: string }> } | null)?.roles ?? [];
  if (!roles.some((r) => r.name === 'owner')) {
    return { ok: false, error: 'forbidden' };
  }

  try {
    await seedDemo(ctx);
  } catch {
    return { ok: false, error: 'seed_failed' };
  }

  await withBypass((tx) =>
    tx.tenant.updateMany({
      where: { id: tenant.id },
      data: { demoImportedAt: new Date() },
    }),
  );
  await setOnboardingState(tenant.id, { demoLoaded: true });
  revalidatePath('/dashboard');
  return { ok: true };
}
