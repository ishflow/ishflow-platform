import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export type SavedViewInput = {
  tenantId: string;
  userId: string;
  kind: string;
  name: string;
  payload: unknown;
};

export async function createSavedView(tx: Tx, input: SavedViewInput) {
  return tx.savedView.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      kind: input.kind,
      name: input.name,
      payload: input.payload as Prisma.InputJsonValue,
    },
  });
}

export async function listSavedViews(tx: Tx, tenantId: string, userId: string, kind: string) {
  return tx.savedView.findMany({
    where: { tenantId, userId, kind, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getSavedView(tx: Tx, tenantId: string, userId: string, id: string) {
  return tx.savedView.findFirst({
    where: { id, tenantId, userId, deletedAt: null },
  });
}

export async function deleteSavedView(tx: Tx, tenantId: string, userId: string, id: string) {
  await tx.savedView.updateMany({
    where: { id, tenantId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

/**
 * View preferences — sticky per-(tenant, user, view) UI state that
 * persists across sessions. Reuses the saved_view table with a
 * reserved kind prefix `view-prefs:<viewId>` so we don't need a new
 * schema migration. Single row per (tenant, user, kind) — helper
 * upserts.
 *
 * Used by register-view matrix column picker, future column-order
 * preferences, etc. Distinct from regular saved views (which the user
 * names and may have many of).
 */
const VIEW_PREFS_KIND_PREFIX = 'view-prefs:';

export function viewPrefsKind(viewId: string): string {
  return VIEW_PREFS_KIND_PREFIX + viewId;
}

export async function getViewPreference(tx: Tx, tenantId: string, userId: string, viewId: string) {
  return tx.savedView.findFirst({
    where: { tenantId, userId, kind: viewPrefsKind(viewId), deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function upsertViewPreference(
  tx: Tx,
  tenantId: string,
  userId: string,
  viewId: string,
  payload: unknown,
) {
  const existing = await getViewPreference(tx, tenantId, userId, viewId);
  if (existing) {
    return tx.savedView.update({
      where: { id: existing.id },
      data: { payload: payload as Prisma.InputJsonValue, updatedAt: new Date() },
    });
  }
  return tx.savedView.create({
    data: {
      tenantId,
      userId,
      kind: viewPrefsKind(viewId),
      name: viewPrefsKind(viewId), // internal name = kind
      payload: payload as Prisma.InputJsonValue,
    },
  });
}
