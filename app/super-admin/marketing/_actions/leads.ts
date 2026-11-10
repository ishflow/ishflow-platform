'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import {
  isLeadStatus,
  updateLeadStatus as updateLeadStatusHelper,
} from '@/platform/super-admin/marketing';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export async function updateLeadStatusAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id) throw new Error('id required');
  if (!isLeadStatus(status)) throw new Error('invalid status');
  await updateLeadStatusHelper({
    id,
    status,
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for'),
    actorUserAgent: h.get('user-agent'),
  });
  revalidatePath('/super-admin/marketing/leads');
}
