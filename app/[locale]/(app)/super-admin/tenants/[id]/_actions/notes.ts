'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const MAX_NOTE_LEN = 16_000;

const addSchema = z.object({
  tenantId: z.string().uuid(),
  body: z.string().trim().min(1).max(MAX_NOTE_LEN),
});

const deleteSchema = z.object({
  tenantId: z.string().uuid(),
  noteId: z.string().uuid(),
});

function parseAdd(formData: FormData) {
  const parsed = addSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    body: String(formData.get('body') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  return parsed.data;
}

function parseDelete(formData: FormData) {
  const parsed = deleteSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    noteId: String(formData.get('noteId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  return parsed.data;
}

export async function addNote(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, body } = parseAdd(formData);

  await withBypass(async (tx) => {
    const after = await tx.tenantNote.create({
      data: { tenantId, body, createdBy: ctx.user.id },
    });
    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'note.added',
      tenantId,
      before: null,
      after,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/notes`);
}

export async function deleteNote(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const { tenantId, noteId } = parseDelete(formData);

  await withBypass(async (tx) => {
    const before = await tx.tenantNote.findUnique({ where: { id: noteId } });
    if (!before || before.tenantId !== tenantId) return;

    await tx.tenantNote.delete({ where: { id: noteId } });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'note.deleted',
      tenantId,
      before,
      after: null,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/notes`);
}
