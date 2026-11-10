// Re-create the dev bypass tenant + user + owner membership after a
// db:reset --skip-seed. Mirrors `platform/auth/dev-bypass.ts` constants so
// the in-process module cache (kept by `next dev`) keeps pointing at a
// tenant that now actually exists. Skips seedSystemRoles to keep this
// script dependency-free — the dev bypass code path re-seeds on first
// request if roles are missing, but we pre-seed them here to satisfy the
// foreign-key from membership → role.
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const DEV_BYPASS_TENANT_ID = '00000000-0000-0000-0000-000000d3b001';
const DEV_BYPASS_USER_ID = '00000000-0000-0000-0000-000000d3b002';
const DEV_BYPASS_CLERK_ORG_ID = 'org_dev_bypass';
const DEV_BYPASS_CLERK_USER_ID = 'user_dev_bypass';

// Use the superuser connection so we sidestep RLS during seed.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function ensureRoles(tx, tenantId) {
  // Use the platform/auth/seed-system-roles export indirectly: the dev-bypass
  // path calls it itself on the next request. We just need the owner role
  // present so the membership FK resolves. Create the minimal owner.
  const ownerName = 'owner';
  let owner = await tx.role.findUnique({
    where: { tenantId_name: { tenantId, name: ownerName } },
  });
  if (!owner) {
    owner = await tx.role.create({
      data: {
        tenantId,
        name: ownerName,
        description: 'Owner — full access',
        isSystem: true,
        permissions: ['*'],
      },
    });
  }
  return owner;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: DEV_BYPASS_TENANT_ID },
    create: {
      id: DEV_BYPASS_TENANT_ID,
      clerkOrgId: DEV_BYPASS_CLERK_ORG_ID,
      name: 'Dev Bypass',
      slug: 'dev-bypass',
      currency: 'USD',
      plan: 'enterprise',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });

  const user = await prisma.user.upsert({
    where: { id: DEV_BYPASS_USER_ID },
    create: {
      id: DEV_BYPASS_USER_ID,
      clerkId: DEV_BYPASS_CLERK_USER_ID,
      // Valid email required — mobile /me runs Zod `.email()` (see dev-bypass.ts).
      email: 'dev-bypass@ishflow.dev',
      firstName: 'Dev',
      lastName: 'Bypass',
    },
    update: { email: 'dev-bypass@ishflow.dev' },
  });

  const ownerRole = await ensureRoles(prisma, tenant.id);

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      roles: { connect: { id: ownerRole.id } },
    },
    update: { roles: { set: [{ id: ownerRole.id }] } },
  });

  console.log(`✓ dev-bypass tenant ${tenant.id} + user ${user.id} + owner role seeded`);
}

await main();
await prisma.$disconnect();
