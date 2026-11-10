import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveIdempotency, storeIdempotency } from './idempotency';

const tenantId = randomUUID();

beforeAll(async () => {
  await withBypass((tx) =>
    tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'Idem',
        slug: `idem-${tenantId.slice(0, 8)}`,
      },
    }),
  );
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM idempotency_key WHERE tenant_id = '${tenantId}'`);
    await tx.tenant.delete({ where: { id: tenantId } });
  });
  await prisma.$disconnect();
});

describe('idempotency', () => {
  it('returns null when no entry exists', async () => {
    const result = await resolveIdempotency(tenantId, randomUUID());
    expect(result).toBeNull();
  });

  it('stores and returns the previously-recorded response', async () => {
    const key = randomUUID();
    const resourceId = randomUUID();
    const body = { id: resourceId, number: 'INV-1' };

    await storeIdempotency(tenantId, key, {
      resourceType: 'sales.invoice',
      resourceId,
      responseBody: body,
      statusCode: 201,
    });

    const hit = await resolveIdempotency(tenantId, key);
    expect(hit).not.toBeNull();
    expect(hit?.resourceId).toBe(resourceId);
    expect(hit?.responseBody).toEqual(body);
    expect(hit?.statusCode).toBe(201);
  });

  it('rejects non-uuid keys', async () => {
    await expect(resolveIdempotency(tenantId, 'not-a-uuid')).rejects.toThrow(/uuid/i);
  });
});
