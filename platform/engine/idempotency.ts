import { withTenant } from '@/platform/db/tenant-context';
import { z } from 'zod';

const uuidSchema = z.string().uuid('idempotency key must be a UUID');

export type IdempotencyHit = {
  resourceType: string;
  resourceId: string;
  responseBody: unknown;
  statusCode: number;
};

export async function resolveIdempotency(
  tenantId: string,
  key: string,
): Promise<IdempotencyHit | null> {
  uuidSchema.parse(key);
  return withTenant(tenantId, async (tx) => {
    const row = (await (
      tx as unknown as {
        idempotencyKey: {
          findUnique: (a: unknown) => Promise<{
            resourceType: string;
            resourceId: string;
            responseBody: unknown;
            statusCode: number;
          } | null>;
        };
      }
    ).idempotencyKey.findUnique({
      where: { tenantId_key: { tenantId, key } },
    })) as IdempotencyHit | null;
    return row;
  });
}

export async function storeIdempotency(
  tenantId: string,
  key: string,
  params: {
    resourceType: string;
    resourceId: string;
    responseBody: unknown;
    statusCode: number;
  },
): Promise<void> {
  uuidSchema.parse(key);
  await withTenant(tenantId, async (tx) => {
    await (
      tx as unknown as {
        idempotencyKey: {
          create: (a: unknown) => Promise<unknown>;
        };
      }
    ).idempotencyKey.create({
      data: {
        tenantId,
        key,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        responseBody: params.responseBody as never,
        statusCode: params.statusCode,
      },
    });
  });
}
