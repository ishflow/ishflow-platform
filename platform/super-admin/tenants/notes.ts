import { withBypass } from '@/platform/db/tenant-context';
import { Prisma, type TenantNote } from '@prisma/client';

export interface TenantNoteRow {
  id: string;
  body: string;
  createdAt: Date;
  createdBy: string;
  authorEmail: string | null;
}

/**
 * List notes for a tenant, most-recent first. Joins the User table on
 * `createdBy` so the SA UI can show the author's email.
 */
export async function listTenantNotes(tenantId: string): Promise<TenantNoteRow[]> {
  return withBypass(async (tx) => {
    const notes = await tx.tenantNote.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (notes.length === 0) return [];

    const userIds = Array.from(new Set(notes.map((n) => n.createdBy)));
    const users = await tx.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u.email]));

    return notes.map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt,
      createdBy: n.createdBy,
      authorEmail: byId.get(n.createdBy) ?? null,
    }));
  });
}

export interface CreateTenantNoteInput {
  tenantId: string;
  body: string;
  actorUserId: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function createTenantNote(input: CreateTenantNoteInput): Promise<TenantNote> {
  return withBypass(async (tx) => {
    const note = await tx.tenantNote.create({
      data: {
        tenantId: input.tenantId,
        body: input.body,
        createdBy: input.actorUserId,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.note_added',
        tenantId: input.tenantId,
        before: Prisma.JsonNull,
        after: {
          noteId: note.id,
          length: input.body.length,
        } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });

    return note;
  });
}

export interface DeleteTenantNoteInput {
  tenantId: string;
  noteId: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function deleteTenantNote(input: DeleteTenantNoteInput): Promise<void> {
  await withBypass(async (tx) => {
    const before = await tx.tenantNote.findUnique({ where: { id: input.noteId } });
    if (!before || before.tenantId !== input.tenantId) return;

    await tx.tenantNote.delete({ where: { id: input.noteId } });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.note_removed',
        tenantId: input.tenantId,
        before: {
          noteId: before.id,
          length: before.body.length,
        } as Prisma.InputJsonValue,
        after: Prisma.JsonNull,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}
