import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, describe, expect, it } from 'vitest';

import { getSetupProgress } from './setup-progress';

const TEST_SLUG_PREFIX = 't-setup-';
const TEST_EMAIL_DOMAIN = '@setup.ishflow';

function makeOrgId(): string {
  return `org_${randomUUID().replace(/-/g, '')}`;
}

function makeSlug(): string {
  return `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`;
}

async function makeTenant(extras: { demoImportedAt?: Date | null } = {}): Promise<string> {
  const tenant = await prisma.tenant.create({
    data: {
      clerkOrgId: makeOrgId(),
      name: 'setup-progress fixture',
      slug: makeSlug(),
      ...(extras.demoImportedAt !== undefined ? { demoImportedAt: extras.demoImportedAt } : {}),
    },
    select: { id: true },
  });
  return tenant.id;
}

async function makeUser(): Promise<string> {
  const u = await prisma.user.create({
    data: {
      clerkId: `user_${randomUUID().replace(/-/g, '')}`,
      email: `${randomUUID().slice(0, 12)}${TEST_EMAIL_DOMAIN}`,
      firstName: 'Setup',
      lastName: 'Test',
    },
    select: { id: true },
  });
  return u.id;
}

async function attachMembership(tenantId: string, userId: string): Promise<void> {
  await withBypass((tx) => tx.membership.create({ data: { tenantId, userId } }));
}

async function seedCustomer(tenantId: string, name = 'C1'): Promise<void> {
  await withBypass((tx) =>
    tx.catalog_sales_customer.create({
      data: {
        tenantId,
        code: randomUUID().slice(0, 8).toUpperCase(),
        name: `${name}-${randomUUID().slice(0, 6)}`,
      },
    }),
  );
}

async function seedProduct(tenantId: string, code = 'P1'): Promise<void> {
  await withBypass((tx) =>
    tx.catalog_inventory_product.create({
      data: {
        tenantId,
        code: `${code}-${randomUUID().slice(0, 6)}`,
        name: `Product ${code}`,
      },
    }),
  );
}

async function seedPostedInvoice(tenantId: string): Promise<void> {
  await withBypass((tx) =>
    tx.document_sales_invoice.create({
      data: {
        tenantId,
        number: `INV-${randomUUID().slice(0, 6)}`,
        status: 'POSTED',
        postedAt: new Date(),
        date: new Date(),
        customer: randomUUID(),
        warehouse: randomUUID(),
      },
    }),
  );
}

afterEach(async () => {
  // The tenant-scoped catalog/document tables have no Prisma relation back to
  // Tenant, so we collect tenantIds explicitly and delete by foreign key.
  const tenantIds = (
    await prisma.tenant.findMany({
      where: { slug: { startsWith: TEST_SLUG_PREFIX } },
      select: { id: true },
    })
  ).map((t) => t.id);

  if (tenantIds.length > 0) {
    await withBypass(async (tx) => {
      await tx.document_sales_invoice.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.catalog_sales_customer.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.catalog_inventory_product.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.membership.deleteMany({ where: { tenantId: { in: tenantIds } } });
    });
  }
  await prisma.user.deleteMany({ where: { email: { contains: TEST_EMAIL_DOMAIN } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } });
});

describe('getSetupProgress', () => {
  it('returns only workspaceCreated=true for an empty tenant', async () => {
    const tenantId = await makeTenant();

    const progress = await getSetupProgress(tenantId);

    expect(progress).toEqual({
      workspaceCreated: true,
      demoImported: false,
      invitesSent: false,
      firstCustomerAdded: false,
      firstProductAdded: false,
      firstInvoicePosted: false,
    });
  });

  it('reports demoImported=true and catalog flags when demo data is present', async () => {
    const tenantId = await makeTenant({ demoImportedAt: new Date() });
    await seedCustomer(tenantId);
    await seedProduct(tenantId);

    const progress = await getSetupProgress(tenantId);

    expect(progress).not.toBeNull();
    expect(progress).toMatchObject({
      workspaceCreated: true,
      demoImported: true,
      firstCustomerAdded: true,
      firstProductAdded: true,
      invitesSent: false,
      firstInvoicePosted: false,
    });
  });

  it('treats invitesSent=true only when a second membership exists', async () => {
    const tenantId = await makeTenant();
    const owner = await makeUser();
    await attachMembership(tenantId, owner);

    const singleOwner = await getSetupProgress(tenantId);
    expect(singleOwner?.invitesSent).toBe(false);

    const invitee = await makeUser();
    await attachMembership(tenantId, invitee);

    const withInvite = await getSetupProgress(tenantId);
    expect(withInvite?.invitesSent).toBe(true);
  });

  it('ignores non-POSTED invoices for firstInvoicePosted', async () => {
    const tenantId = await makeTenant();
    await withBypass((tx) =>
      tx.document_sales_invoice.create({
        data: {
          tenantId,
          number: `INV-DRAFT-${randomUUID().slice(0, 6)}`,
          status: 'SAVED',
          date: new Date(),
          customer: randomUUID(),
          warehouse: randomUUID(),
        },
      }),
    );

    const progress = await getSetupProgress(tenantId);
    expect(progress?.firstInvoicePosted).toBe(false);
  });

  it('returns null when every flag is satisfied', async () => {
    const tenantId = await makeTenant({ demoImportedAt: new Date() });
    const owner = await makeUser();
    const invitee = await makeUser();
    await attachMembership(tenantId, owner);
    await attachMembership(tenantId, invitee);
    await seedCustomer(tenantId);
    await seedProduct(tenantId);
    await seedPostedInvoice(tenantId);

    const progress = await getSetupProgress(tenantId);
    expect(progress).toBeNull();
  });
});
