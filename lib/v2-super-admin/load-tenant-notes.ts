import { withBypass } from '@/platform/db/tenant-context';

export interface SaNoteView {
  id: string;
  body: string;
  createdAt: Date;
  createdByName: string | null;
}

export async function loadSaTenantNotes(tenantId: string): Promise<SaNoteView[]> {
  return withBypass(async (tx) => {
    const rows = await tx.tenantNote.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
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

    return rows.map<SaNoteView>((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      createdByName: nameById.get(r.createdBy) ?? null,
    }));
  });
}
