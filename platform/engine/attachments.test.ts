import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAttachment, deleteAttachment, getAttachment, listAttachments } from './attachments';

const tenantId = randomUUID();
const userId = randomUUID();
const entityId = randomUUID();

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'Attach test',
        slug: `attach-${tenantId.slice(0, 8)}`,
      },
    });
    await tx.user.create({
      data: {
        id: userId,
        clerkId: `user_${userId}`,
        email: `${userId}@test.example`,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM attachment WHERE tenant_id = $1::uuid', tenantId);
    await tx.tenant.delete({ where: { id: tenantId } });
    await tx.user.delete({ where: { id: userId } });
  });
  await prisma.$disconnect();
});

describe('attachments engine', () => {
  it('creates and lists attachments scoped to an entity', async () => {
    await withTenant(tenantId, async (tx) => {
      const a = await createAttachment(tx, {
        tenantId,
        entity: 'document.sales.invoice',
        entityId,
        filename: 'photo.png',
        contentType: 'image/png',
        size: 1024,
        objectKey: `tenants/${tenantId}/${entityId}/${randomUUID()}/photo.png`,
        uploadedBy: userId,
      });
      const list = await listAttachments(tx, tenantId, 'document.sales.invoice', entityId);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.some((r) => r.id === a.id)).toBe(true);
    });
  });

  it('soft-deletes attachments and hides them from listings', async () => {
    await withTenant(tenantId, async (tx) => {
      const a = await createAttachment(tx, {
        tenantId,
        entity: 'catalog.inventory.product',
        entityId,
        filename: 'spec.pdf',
        contentType: 'application/pdf',
        size: 2048,
        objectKey: `tenants/${tenantId}/${entityId}/${randomUUID()}/spec.pdf`,
        uploadedBy: userId,
      });
      await deleteAttachment(tx, tenantId, a.id);
      const list = await listAttachments(tx, tenantId, a.entity, a.entityId);
      expect(list.some((r) => r.id === a.id)).toBe(false);
      const single = await getAttachment(tx, tenantId, a.id);
      expect(single).toBeNull();
    });
  });

  it('getAttachment enforces tenant boundary', async () => {
    const a = await withTenant(tenantId, (tx) =>
      createAttachment(tx, {
        tenantId,
        entity: 'document.sales.invoice',
        entityId,
        filename: 'boundary.png',
        contentType: 'image/png',
        size: 16,
        objectKey: `tenants/${tenantId}/${entityId}/${randomUUID()}/boundary.png`,
        uploadedBy: userId,
      }),
    );

    const otherTenant = randomUUID();
    await withBypass((tx) =>
      tx.tenant.create({
        data: {
          id: otherTenant,
          clerkOrgId: `org_${otherTenant}`,
          name: 'Other tenant',
          slug: `other-${otherTenant.slice(0, 8)}`,
        },
      }),
    );
    try {
      const result = await withTenant(otherTenant, (tx) => getAttachment(tx, otherTenant, a.id));
      expect(result).toBeNull();
    } finally {
      await withBypass((tx) => tx.tenant.delete({ where: { id: otherTenant } }));
    }
  });
});
