'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { createTenantNote, deleteTenantNote } from '@/platform/super-admin/tenants/notes';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const MAX_NOTE_LEN = 16_000;

export async function addNoteAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const body = String(formData.get('body') ?? '')
    .trim()
    .slice(0, MAX_NOTE_LEN);
  if (!tenantId || !body) throw new Error('invalid form');

  await createTenantNote({
    tenantId,
    body,
    actorUserId: ctx.user.id,
    actorClerkId: ctx.user.clerkId,
    ip: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/notes`);
}

export async function removeNoteAction(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const noteId = String(formData.get('noteId') ?? '').trim();
  if (!tenantId || !noteId) throw new Error('invalid form');

  await deleteTenantNote({
    tenantId,
    noteId,
    actorClerkId: ctx.user.clerkId,
    ip: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/notes`);
}
