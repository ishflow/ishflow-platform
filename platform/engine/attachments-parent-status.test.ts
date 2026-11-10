import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getParentDocStatus } from './attachments';

const tenantId = randomUUID();
const invoiceId = randomUUID();

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'ParentDocStatus test',
        slug: `pds-${tenantId.slice(0, 8)}`,
      },
    });
    // Seed a POSTED sales invoice to test the happy path
    await tx.document_sales_invoice.create({
      data: {
        id: invoiceId,
        tenantId,
        number: 'TEST-PDS-1',
        status: 'POSTED',
        date: new Date('2026-01-01'),
        customer: randomUUID(),
        warehouse: randomUUID(),
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.document_sales_invoice.deleteMany({ where: { tenantId } });
    await tx.tenant.delete({ where: { id: tenantId } });
  });
  await prisma.$disconnect();
});

describe('getParentDocStatus', () => {
  it('returns null for catalog entities', async () => {
    await withTenant(tenantId, async (tx) => {
      const result = await getParentDocStatus(tx, 'catalog.inventory.product', randomUUID());
      expect(result).toBeNull();
    });
  });

  it('returns null for unknown document module/name', async () => {
    await withTenant(tenantId, async (tx) => {
      const result = await getParentDocStatus(tx, 'document.unknown.bogus', randomUUID());
      expect(result).toBeNull();
    });
  });

  it('returns POSTED for a POSTED sales invoice', async () => {
    await withTenant(tenantId, async (tx) => {
      const result = await getParentDocStatus(tx, 'document.sales.invoice', invoiceId);
      expect(result).toBe('POSTED');
    });
  });

  it('returns null for a non-existent document id', async () => {
    await withTenant(tenantId, async (tx) => {
      const result = await getParentDocStatus(tx, 'document.sales.invoice', randomUUID());
      expect(result).toBeNull();
    });
  });
});
