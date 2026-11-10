'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import {
  type SubscriptionFeatureState,
  getSubscriptionFeatureState,
  setSubscriptionFeatureState,
} from '@/platform/billing/feature-state';
import { withBypass } from '@/platform/db/tenant-context';

const VALID_STATES: readonly SubscriptionFeatureState[] = ['enabled', 'disabled', 'hidden'];

function isValidState(value: string): value is SubscriptionFeatureState {
  return (VALID_STATES as readonly string[]).includes(value);
}

export async function updateGlobalBillingGate(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();

  const raw = String(formData.get('state') ?? '');
  if (!isValidState(raw)) throw new Error('invalid state');
  const next = raw;

  const before = await getSubscriptionFeatureState();
  if (before === next) return;

  await setSubscriptionFeatureState(next, ctx.user.id);

  await withBypass((tx) =>
    tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: 'gate.flipped',
        before: { state: before },
        after: { state: next },
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    }),
  );

  revalidatePath('/super-admin/billing');
}
