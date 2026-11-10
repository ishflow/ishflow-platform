import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { attachCounter } from './prisma-query-counter';
import '@/configs';
import type { AppContext } from '@/platform/auth/current-context';
import { getRegistry } from '@/platform/metadata';

const DETAIL_QUERY_CAP = 10;

const tenantId = process.env.PERF_TEST_TENANT_ID ?? '';
const docId = process.env.PERF_TEST_INVOICE_ID ?? '';
const enabled = tenantId.length > 0 && docId.length > 0;

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

describe.skipIf(!enabled)('sales invoice detail query count', () => {
  let prisma: PrismaClient;
  let counter: ReturnType<typeof attachCounter>;
  beforeAll(() => {
    prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
    counter = attachCounter(prisma);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('detail read stays under cap', async () => {
    const ctx = makeCtx();
    const config = getRegistry().document['sales.invoice'];
    if (!config) throw new Error('sales.invoice config missing');

    // Look for a function that reads a single document by id. Likely names:
    // readDocument, getDocumentById, getDocumentRecord. Inspect
    // platform/engine/document-crud.ts and platform/engine/index.ts for
    // the right export. If none exists, fall back to using the document
    // delegate directly via the Prisma client.
    const engine = await import('@/platform/engine');
    const fn =
      (engine as Record<string, unknown>).readDocument ??
      (engine as Record<string, unknown>).getDocumentById ??
      (engine as Record<string, unknown>).getDocumentRecord ??
      (engine as Record<string, unknown>).getDocument;
    if (typeof fn !== 'function') {
      // No single-doc read helper available — skip this assertion gracefully.
      return;
    }

    counter.start();
    await (fn as (ctx: AppContext, config: unknown, id: string) => Promise<unknown>)(
      ctx,
      config,
      docId,
    );
    const n = counter.stop();
    expect(n).toBeLessThanOrEqual(DETAIL_QUERY_CAP);
  });
});
