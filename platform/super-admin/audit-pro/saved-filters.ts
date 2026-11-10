/**
 * Saved-filter CRUD for the audit pro page.
 *
 * Records live in `PlatformAuditSavedFilter` (already applied via the SA
 * mega-schema migration). The criteria JSON shape is a strict subset of
 * the `AuditProFilters` interface, validated with Zod on write so a
 * corrupted row can never poison the page.
 */

import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

export const SavedFilterCriteriaSchema = z.object({
  action: z.string().optional(),
  actorClerkId: z.string().optional(),
  tenantId: z.string().optional(),
  entity: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type SavedFilterCriteria = z.infer<typeof SavedFilterCriteriaSchema>;

export interface SavedFilter {
  id: string;
  name: string;
  ownerClerkId: string;
  criteria: SavedFilterCriteria;
  createdAt: Date;
}

/** List filters owned by the operator. Returns at most 50. */
export async function listSavedFilters(ownerClerkId: string): Promise<SavedFilter[]> {
  const rows = await withBypass((tx) =>
    tx.platformAuditSavedFilter.findMany({
      where: { ownerClerkId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    ownerClerkId: r.ownerClerkId,
    criteria: SavedFilterCriteriaSchema.safeParse(r.criteria).data ?? {},
    createdAt: r.createdAt,
  }));
}

export async function createSavedFilter(input: {
  name: string;
  ownerClerkId: string;
  criteria: SavedFilterCriteria;
}): Promise<SavedFilter> {
  const trimmedName = input.name.trim();
  if (trimmedName.length === 0) throw new Error('saved_filter_name_empty');
  if (trimmedName.length > 80) throw new Error('saved_filter_name_too_long');
  const parsed = SavedFilterCriteriaSchema.parse(input.criteria);
  const row = await withBypass((tx) =>
    tx.platformAuditSavedFilter.create({
      data: {
        name: trimmedName,
        ownerClerkId: input.ownerClerkId,
        criteria: parsed as Prisma.InputJsonValue,
      },
    }),
  );
  return {
    id: row.id,
    name: row.name,
    ownerClerkId: row.ownerClerkId,
    criteria: parsed,
    createdAt: row.createdAt,
  };
}

export async function deleteSavedFilter(input: {
  id: string;
  ownerClerkId: string;
}): Promise<void> {
  // Scope by owner to prevent deleting another operator's filter even though
  // SA is a single-tenant role today.
  await withBypass((tx) =>
    tx.platformAuditSavedFilter.deleteMany({
      where: { id: input.id, ownerClerkId: input.ownerClerkId },
    }),
  );
}
