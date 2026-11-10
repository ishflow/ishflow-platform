'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { unsubscribeNewsletter as unsubscribeHelper } from '@/platform/super-admin/marketing';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export async function unsubscribeNewsletterAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('id required');
  await unsubscribeHelper({
    id,
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for'),
    actorUserAgent: h.get('user-agent'),
  });
  revalidatePath('/super-admin/marketing/newsletter');
}
