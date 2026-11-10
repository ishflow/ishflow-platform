import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getOrganizationInvitationList = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(() =>
    Promise.resolve({
      organizations: { getOrganizationInvitationList },
    }),
  ),
}));

import { getUsage } from './usage';

const TEST_SLUG_PREFIX = 't-usage-';
const TEST_EMAIL_DOMAIN = '@usage.ishflow';

async function makeTenant(): Promise<string> {
  const tenant = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'usage fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
      },
      select: { id: true },
    }),
  );
  return tenant.id;
}

async function makeUser(): Promise<string> {
  const u = await withBypass((tx) =>
    tx.user.create({
      data: {
        clerkId: `user_${randomUUID().replace(/-/g, '')}`,
        email: `${randomUUID().slice(0, 12)}${TEST_EMAIL_DOMAIN}`,
      },
      select: { id: true },
    }),
  );
  return u.id;
}

async function attachMembership(tenantId: string, userId: string): Promise<void> {
  await withBypass((tx) => tx.membership.create({ data: { tenantId, userId } }));
}

afterEach(async () => {
  const tenantIds = (
    await withBypass((tx) =>
      tx.tenant.findMany({
        where: { slug: { startsWith: TEST_SLUG_PREFIX } },
        select: { id: true },
      }),
    )
  ).map((t) => t.id);
  if (tenantIds.length > 0) {
    await withBypass(async (tx) => {
      await tx.document_sales_invoice.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.attachment.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.savedView.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.membership.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    });
  }
  await withBypass((tx) =>
    tx.user.deleteMany({ where: { email: { contains: TEST_EMAIL_DOMAIN } } }),
  );
});

beforeEach(() => {
  getOrganizationInvitationList.mockReset();
  // Default: no pending invitations. Individual tests override as needed.
  getOrganizationInvitationList.mockResolvedValue({ data: [], totalCount: 0 });
});

describe('getUsage', () => {
  it('returns zero counts for an empty tenant', async () => {
    const id = await makeTenant();

    const usage = await getUsage(id);

    expect(usage).toEqual({
      members: 0,
      monthlyPostedDocs: 0,
      storageBytes: 0,
      savedViews: 0,
    });
  });

  it('counts memberships, posted docs (this month only), saved views, and storage', async () => {
    const id = await makeTenant();
    const u1 = await makeUser();
    const u2 = await makeUser();
    await attachMembership(id, u1);
    await attachMembership(id, u2);

    // Posted this month (should count)
    await withBypass((tx) =>
      tx.document_sales_invoice.create({
        data: {
          tenantId: id,
          number: `INV-${randomUUID().slice(0, 6)}`,
          status: 'POSTED',
          postedAt: new Date(),
          date: new Date(),
          customer: randomUUID(),
          warehouse: randomUUID(),
        },
      }),
    );
    // Posted last month (should NOT count)
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    await withBypass((tx) =>
      tx.document_sales_invoice.create({
        data: {
          tenantId: id,
          number: `INV-${randomUUID().slice(0, 6)}`,
          status: 'POSTED',
          postedAt: lastMonth,
          date: lastMonth,
          customer: randomUUID(),
          warehouse: randomUUID(),
        },
      }),
    );
    // SAVED, not POSTED (should NOT count)
    await withBypass((tx) =>
      tx.document_sales_invoice.create({
        data: {
          tenantId: id,
          number: `INV-${randomUUID().slice(0, 6)}`,
          status: 'SAVED',
          date: new Date(),
          customer: randomUUID(),
          warehouse: randomUUID(),
        },
      }),
    );

    // Attachments: 100 + 50 = 150 bytes (active); 999 bytes soft-deleted (ignored)
    await withBypass((tx) =>
      tx.attachment.createMany({
        data: [
          {
            tenantId: id,
            entity: 'catalog_sales_customer',
            entityId: randomUUID(),
            filename: 'a.pdf',
            contentType: 'application/pdf',
            size: 100,
            objectKey: `k-${randomUUID()}`,
            uploadedBy: u1,
          },
          {
            tenantId: id,
            entity: 'catalog_sales_customer',
            entityId: randomUUID(),
            filename: 'b.pdf',
            contentType: 'application/pdf',
            size: 50,
            objectKey: `k-${randomUUID()}`,
            uploadedBy: u1,
          },
          {
            tenantId: id,
            entity: 'catalog_sales_customer',
            entityId: randomUUID(),
            filename: 'c.pdf',
            contentType: 'application/pdf',
            size: 999,
            objectKey: `k-${randomUUID()}`,
            uploadedBy: u1,
            deletedAt: new Date(),
          },
        ],
      }),
    );

    // Saved views: 1 active + 1 soft-deleted (ignored)
    await withBypass((tx) =>
      tx.savedView.createMany({
        data: [
          {
            tenantId: id,
            userId: u1,
            kind: 'list:catalog_sales_customer',
            name: `v1-${randomUUID().slice(0, 6)}`,
            payload: {},
          },
          {
            tenantId: id,
            userId: u1,
            kind: 'list:catalog_sales_customer',
            name: `v2-${randomUUID().slice(0, 6)}`,
            payload: {},
            deletedAt: new Date(),
          },
        ],
      }),
    );

    const usage = await getUsage(id);

    expect(usage.members).toBe(2);
    expect(usage.monthlyPostedDocs).toBe(1);
    expect(usage.storageBytes).toBe(150);
    expect(usage.savedViews).toBe(1);
  });

  it('counts pending invitations toward the member seat count', async () => {
    const id = await makeTenant();
    const u1 = await makeUser();
    const u2 = await makeUser();
    await attachMembership(id, u1);
    await attachMembership(id, u2);

    getOrganizationInvitationList.mockResolvedValueOnce({ data: [], totalCount: 3 });

    const usage = await getUsage(id);

    expect(usage.members).toBe(5); // 2 active + 3 pending
  });

  it('falls back to active-only count when Clerk errors', async () => {
    const id = await makeTenant();
    const u1 = await makeUser();
    await attachMembership(id, u1);

    getOrganizationInvitationList.mockRejectedValueOnce(new Error('clerk down'));

    const usage = await getUsage(id);

    expect(usage.members).toBe(1); // pending count = 0 on error
  });
});
