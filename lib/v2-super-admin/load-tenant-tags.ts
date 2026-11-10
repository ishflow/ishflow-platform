import { withBypass } from '@/platform/db/tenant-context';

export interface SaTagView {
  id: string;
  label: string;
  color: string;
  createdAt: Date;
  createdByName: string | null;
}

export async function loadSaTenantTags(tenantId: string): Promise<SaTagView[]> {
  return withBypass(async (tx) => {
    const rows = await tx.tenantTag.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    const creatorIds = Array.from(new Set(rows.map((r) => r.createdBy)));
    const users =
      creatorIds.length > 0
        ? await tx.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : [];
    const nameById = new Map(
      users.map((u) => {
        const full = [u.firstName ?? '', u.lastName ?? ''].join(' ').trim();
        return [u.id, full.length > 0 ? full : u.email] as const;
      }),
    );

    return rows.map<SaTagView>((r) => ({
      id: r.id,
      label: r.label,
      color: r.color,
      createdAt: r.createdAt,
      createdByName: nameById.get(r.createdBy) ?? null,
    }));
  });
}
