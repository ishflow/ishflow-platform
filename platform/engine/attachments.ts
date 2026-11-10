import type { AppContext } from '@/platform/auth/current-context';
import { getRegistry } from '@/platform/metadata/registry';
import type { Prisma } from '@prisma/client';
import { PermissionDeniedError } from './errors';
import { hasPermission } from './permissions';

type Tx = Prisma.TransactionClient;

/**
 * Parse an attachment `entity` string like "document.sales.invoice" or
 * "catalog.inventory.warehouse" and confirm:
 *   1. The referenced config is registered (prevents forging entity ids).
 *   2. The caller holds the required permission — `read` to list/download,
 *      `write` to upload or delete.
 *
 * Throws `PermissionDeniedError` on both forged entity ids and missing
 * permissions so the route handler can return an opaque 403 either way.
 */
export function assertEntityAccess(ctx: AppContext, entity: string, op: 'read' | 'write'): void {
  const parts = entity.split('.');
  if (parts.length < 3) throw new PermissionDeniedError(entity, op);
  const [kind, ...rest] = parts;
  const entityId = rest.join('.');
  const registry = getRegistry();
  const config =
    kind === 'document'
      ? registry.document[entityId]
      : kind === 'catalog'
        ? registry.catalog[entityId]
        : undefined;
  if (!config) throw new PermissionDeniedError(entity, op);
  if (!hasPermission(ctx.permissions, `${entityId}:${op}`)) {
    throw new PermissionDeniedError(entityId, op);
  }
}

export type AttachmentInput = {
  tenantId: string;
  entity: string;
  entityId: string;
  filename: string;
  contentType: string;
  size: number;
  objectKey: string;
  uploadedBy: string;
};

export type AttachmentRow = AttachmentInput & {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
};

export async function createAttachment(tx: Tx, input: AttachmentInput): Promise<AttachmentRow> {
  return tx.attachment.create({ data: input });
}

export async function listAttachments(
  tx: Tx,
  tenantId: string,
  entity: string,
  entityId: string,
): Promise<AttachmentRow[]> {
  return tx.attachment.findMany({
    where: { tenantId, entity, entityId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteAttachment(
  tx: Tx,
  _tenantId: string,
  attachmentId: string,
): Promise<void> {
  await tx.attachment.update({
    where: { id: attachmentId },
    data: { deletedAt: new Date() },
  });
}

export async function getAttachment(
  tx: Tx,
  tenantId: string,
  id: string,
): Promise<AttachmentRow | null> {
  const row = await tx.attachment.findUnique({ where: { id } });
  if (!row || row.tenantId !== tenantId || row.deletedAt) return null;
  return row;
}

/**
 * Look up the parent document's status for an attachment entity. Returns
 * the status string (e.g. 'POSTED', 'SAVED'), or null if the entity is
 * not a document or the parent row can't be located.
 *
 * Used by DELETE handlers to enforce the rule: only admin/owner may
 * delete attachments on POSTED documents (tax/audit retention).
 */
export async function getParentDocStatus(
  tx: Tx,
  entity: string,
  entityId: string,
): Promise<string | null> {
  if (!entity.startsWith('document.')) return null;
  const parts = entity.split('.');
  if (parts.length !== 3) return null;
  const module = parts[1];
  const name = parts[2];
  if (!module || !name) return null;
  const snake = `document_${module}_${name}`;
  const camel = `document${cap(module)}${cap(name)}`;
  const bag = tx as unknown as Record<
    string,
    { findUnique: (args: unknown) => Promise<{ status?: string } | null> } | undefined
  >;
  const delegate = bag[snake] ?? bag[camel];
  if (!delegate) return null;
  const row = await delegate.findUnique({
    where: { id: entityId },
    select: { status: true },
  });
  return row?.status ?? null;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
