'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ticketIdSchema = z.object({ ticketId: z.string().uuid() });

/**
 * Assign the active super-admin actor to a support ticket. No-op when the
 * ticket is already assigned to the same user.
 */
export async function assignToMe(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const parsed = ticketIdSchema.safeParse({
    ticketId: String(formData.get('ticketId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { ticketId } = parsed.data;

  await withBypass(async (tx) => {
    const before = await tx.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, assignedTo: true, status: true },
    });
    if (!before) throw new Error('ticket_op:not_found');
    if (before.assignedTo === ctx.user.id) return;

    await tx.supportTicket.update({
      where: { id: ticketId },
      data: { assignedTo: ctx.user.id },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'support_ticket.assigned',
      tenantId: before.tenantId,
      before: { assignedTo: before.assignedTo },
      after: { assignedTo: ctx.user.id },
    });
  });

  revalidatePath('/super-admin/support');
}

/**
 * Close a support ticket (status='resolved'). Stamps resolvedAt = now.
 * Caller should ensure status is currently 'open' or 'in_progress' via
 * the rowAction's `visibleWhen` predicate.
 */
export async function closeTicket(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const parsed = ticketIdSchema.safeParse({
    ticketId: String(formData.get('ticketId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { ticketId } = parsed.data;

  await withBypass(async (tx) => {
    const before = await tx.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, status: true },
    });
    if (!before) throw new Error('ticket_op:not_found');

    await tx.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'resolved', resolvedAt: new Date() },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'support_ticket.closed',
      tenantId: before.tenantId,
      before: { status: before.status },
      after: { status: 'resolved', resolvedAt: new Date().toISOString() },
    });
  });

  revalidatePath('/super-admin/support');
}
