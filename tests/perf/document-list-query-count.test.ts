import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { attachCounter } from './prisma-query-counter';
import '@/configs';
import type { AppContext } from '@/platform/auth/current-context';
import { enrichDocumentListRows, listDocumentsPaged } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';

// listDocumentsPaged: 1 count + 1 page + 1 set_config = 3
// enrichDocumentListRows: 1 set_config + (refTokens + lineSections) findMany
// sales.invoice has 2 refs (customer + price_type?) + 1 line section ≈ 3
// Generous cap: 14.
const LIST_QUERY_CAP = 14;

const tenantId = process.env.PERF_TEST_TENANT_ID ?? '';
const enabled = tenantId.length > 0;

function makeCtx(): AppContext {
  return {
    user: { id: 'test', email: 'test@example.com' } as AppContext['user'],
    tenant: { id: tenantId, currency: 'USD' } as AppContext['tenant'],
    membership: {
      roleId: 'test',
      userId: 'test',
      tenantId,
    } as unknown as AppContext['membership'],
    permissions: new Set<string>(['sales.invoice:read']),
    scopesByEntity: new Map(),
    addons: new Set(),
  };
}

describe.skipIf(!enabled)('sales invoice list query count', () => {
  let prisma: PrismaClient;
  let counter: ReturnType<typeof attachCounter>;
  beforeAll(() => {
    prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
    counter = attachCounter(prisma);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('list + enrichment combined stays under cap', async () => {
    const ctx = makeCtx();
    const config = getRegistry().document['sales.invoice'];
    if (!config) throw new Error('sales.invoice config missing — register import broken');

    counter.start();
    const page = await listDocumentsPaged(ctx, config, { search: '', page: 1, pageSize: 25 });
    await enrichDocumentListRows(ctx, config, page.rows as never);
    const n = counter.stop();
    expect(n).toBeLessThanOrEqual(LIST_QUERY_CAP);
  });
});
