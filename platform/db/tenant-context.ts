/**
 * Tenant isolation helpers. RLS is enforced by Postgres policies that read
 * the `app.tenant_id` GUC set by `withTenant`. The runtime role used by
 * `DATABASE_URL` MUST have NOSUPERUSER and NOBYPASSRLS — otherwise policies
 * are silently ignored. See `platform/db/role-guard.ts` for the startup
 * check that enforces this, and the spec at
 * the internal design spec.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './index';

type Tx = Prisma.TransactionClient;

const tenantIdSchema = z.string().uuid();

/**
 * Run `fn` inside a transaction with `app.tenant_id` set to `tenantId`.
 * RLS-protected tables are filtered to that tenant for the transaction's lifetime.
 *
 * `tenantId` MUST be a UUID — enforced via Zod to keep the `SET LOCAL` raw
 * SQL safe against injection, since Postgres does not allow parameter binding
 * for `SET`.
 */
export type WithTenantOptions = {
  isolationLevel?: Prisma.TransactionIsolationLevel;
  timeout?: number;
  maxWait?: number;
};

// Prisma's default $transaction timeout is 5s, too tight for Neon seed +
// multi-step admin ops over the network. Pushed to 60s: posting recomputes
// register balances/avg-cost inside the tx, and those scans grow with the
// movement tables — a tenant with 1-2 years of documents needs the headroom
// so a post doesn't time out (and silently leave the document unposted).
const DEFAULT_TX_TIMEOUT = 60_000;
const DEFAULT_TX_MAX_WAIT = 10_000;

function txOpts(options: WithTenantOptions): Parameters<PrismaClient['$transaction']>[1] {
  return {
    timeout: options.timeout ?? DEFAULT_TX_TIMEOUT,
    maxWait: options.maxWait ?? DEFAULT_TX_MAX_WAIT,
    ...(options.isolationLevel ? { isolationLevel: options.isolationLevel } : {}),
  };
}

export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Tx) => Promise<T>,
  options: WithTenantOptions = {},
  client: PrismaClient = prisma,
): Promise<T> {
  const parsed = tenantIdSchema.safeParse(tenantId);
  if (!parsed.success) {
    throw new Error('withTenant: tenantId must be a UUID');
  }
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${parsed.data}'`);
    return fn(tx);
  }, txOpts(options));
}

/**
 * Bypass RLS for trusted server operations (Clerk webhook sync, migrations).
 * Never call from a route handler that serves end users.
 */
export async function withBypass<T>(
  fn: (tx: Tx) => Promise<T>,
  client: PrismaClient = prisma,
  options: WithTenantOptions = {},
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'on'`);
    return fn(tx);
  }, txOpts(options));
}

/**
 * Run `fn` inside a transaction with `app.user_id` set to `userId`. The
 * `user_settings` RLS policy gates rows by this GUC (user-scoped, not
 * tenant-scoped), so per-user preferences must be read/written through here —
 * `withBypass` does NOT apply (that table has no bypass policy). The migration
 * that created `user_settings` reserved this wrapper as the extension point.
 *
 * `userId` MUST be a UUID — enforced via Zod to keep the `SET LOCAL` raw SQL
 * safe (Postgres forbids parameter binding for `SET`).
 */
export async function withUser<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
  options: WithTenantOptions = {},
  client: PrismaClient = prisma,
): Promise<T> {
  const parsed = tenantIdSchema.safeParse(userId);
  if (!parsed.success) {
    throw new Error('withUser: userId must be a UUID');
  }
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.user_id = '${parsed.data}'`);
    return fn(tx);
  }, txOpts(options));
}
