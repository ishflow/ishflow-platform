import { SA_TENANT_FIXTURE, type SaTenantRow } from './sa-tenant-data';

/**
 * Look up a tenant by id from the fixture; falls back to the Sample Trading
 * record so unknown ids still render a complete detail page (Faz 1 visual
 * port has no DB yet). Replace with `withBypass + prisma.tenant.findUnique`
 * during integration.
 */
const FALLBACK: SaTenantRow = {
  id: 'tenant_01HX8K3J9SAMPLE',
  name: 'Sample Trading',
  slug: 'sample-trading',
  plan: 'Pro',
  mrrUsd: 49,
  members: 4,
  invoices: 218,
  lastActivity: '17.05 09:14',
  region: '🇹🇷 tr',
  locale: 'tr',
  suspended: false,
};

export function getSaTenantById(id: string): SaTenantRow {
  return SA_TENANT_FIXTURE.find((t) => t.id === id) ?? FALLBACK;
}
