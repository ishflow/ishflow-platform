import type { AppContext } from '@/platform/auth/current-context';
import { accountsPayableTotal, accountsReceivableTotal } from '@/platform/engine/dashboard-queries';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { attachCounter } from './prisma-query-counter';

const PER_KPI_QUERY_CAP = 6; // 2 groupBys × (1 set_config + 1 select) ~= 4; allow 2 headroom for noise.

const tenantId = process.env.PERF_TEST_TENANT_ID ?? '';
const enabled = tenantId.length > 0;

function makeCtx(): Pick<AppContext, 'tenant'> & { permissions: Set<string> } {
  return {
    tenant: { id: tenantId, currency: 'USD' } as AppContext['tenant'],
    permissions: new Set<string>(['sales.invoice:read', 'purchases.invoice:read']),
  };
}

describe.skipIf(!enabled)('dashboard KPI queries', () => {
  let prisma: PrismaClient;
  let counter: ReturnType<typeof attachCounter>;
  beforeAll(() => {
    prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
    counter = attachCounter(prisma);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('accountsReceivableTotal stays under cap', async () => {
    counter.start();
    await accountsReceivableTotal(makeCtx() as never);
    const n = counter.stop();
    expect(n).toBeLessThanOrEqual(PER_KPI_QUERY_CAP);
  });

  it('accountsPayableTotal stays under cap', async () => {
    counter.start();
    await accountsPayableTotal(makeCtx() as never);
    const n = counter.stop();
    expect(n).toBeLessThanOrEqual(PER_KPI_QUERY_CAP);
  });
});
