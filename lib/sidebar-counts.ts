import { withTenant } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata';
import { unstable_cache } from 'next/cache';

function tableName(kind: 'catalog' | 'document', module: string, name: string): string {
  return `${kind}_${module}_${name}`;
}

async function fetchCounts(tenantId: string): Promise<Record<string, number>> {
  const registry = getRegistry();
  const out: Record<string, number> = {};
  await withTenant(tenantId, async (tx) => {
    for (const c of Object.values(registry.catalog)) {
      const rows = await tx.$queryRawUnsafe<{ c: bigint }[]>(
        `SELECT COUNT(*)::bigint as c FROM ${tableName('catalog', c.module, c.name)}
           WHERE tenant_id = $1::uuid AND deleted_at IS NULL`,
        tenantId,
      );
      out[`catalog.${c.module}.${c.name}`] = Number(rows[0]?.c ?? 0);
    }
    for (const d of Object.values(registry.document)) {
      const rows = await tx.$queryRawUnsafe<{ c: bigint }[]>(
        `SELECT COUNT(*)::bigint as c FROM ${tableName('document', d.module, d.name)}
           WHERE tenant_id = $1::uuid AND deleted_at IS NULL`,
        tenantId,
      );
      out[`document.${d.module}.${d.name}`] = Number(rows[0]?.c ?? 0);
    }
  });
  return out;
}

export async function getSidebarCounts(tenantId: string): Promise<Record<string, number>> {
  const cached = unstable_cache(() => fetchCounts(tenantId), ['sidebar-counts', tenantId], {
    revalidate: 30,
    tags: [`sidebar-counts:${tenantId}`],
  });
  return cached();
}
