import type { AppContext } from '@/platform/auth/current-context';
import { enforcePlanLimit } from '@/platform/billing/enforce';
import { withTenant } from '@/platform/db/tenant-context';
import {
  type AccumulationRegisterConfig,
  type DocumentConfig,
  type DocumentRowWithLines,
  type InformationRegisterConfig,
  type PostingContext,
  type RegisterConfig,
  getRegistry,
  isAccumulationRegister,
  isInformationRegister,
} from '@/platform/metadata';
import { sendPushToUser } from '@/platform/notifications/push';
import { writeAudit } from './audit-log';
import { checkDoc } from './document-crud';
import {
  InvalidStatusError,
  NotFoundError,
  PostingValidationError,
  ViewAsReadOnlyError,
} from './errors';
import { assertPeriodOpen } from './period-close-guard';
import { movementDelegate, registerBalance, registerBalanceAll } from './register-query';
import { scopeMatches } from './scopes';

type PrismaDoc = {
  findUnique: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
};

type PrismaLineFull = {
  findMany: (args: unknown) => Promise<unknown[]>;
};

type PrismaMovementFull = {
  createMany: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown[]>;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function docDelegate(tx: unknown, config: DocumentConfig): PrismaDoc {
  const snake = `document_${config.module}_${config.name}`;
  const camel = `document${capitalize(config.module)}${capitalize(config.name)}`;
  const bag = tx as Record<string, PrismaDoc | undefined>;
  const d = bag[snake] ?? bag[camel];
  if (!d) throw new Error(`docDelegate: no Prisma model for ${snake}`);
  return d;
}

function lineDelegateFull(tx: unknown, config: DocumentConfig, sectionKey: string): PrismaLineFull {
  const prismaKey = `documentLine_${config.module}_${config.name}_${sectionKey}`;
  const snake = `document_line_${config.module}_${config.name}_${sectionKey}`;
  const bag = tx as Record<string, PrismaLineFull | undefined>;
  const d = bag[prismaKey] ?? bag[snake];
  if (!d) throw new Error(`lineDelegateFull: no Prisma model for ${prismaKey}`);
  return d;
}

async function loadLinesForPosting(
  tx: unknown,
  config: DocumentConfig,
  documentId: string,
): Promise<Record<string, unknown[]> | undefined> {
  if (!config.lines) return undefined;
  const out: Record<string, unknown[]> = {};
  for (const sectionKey of Object.keys(config.lines)) {
    const rows = await lineDelegateFull(tx, config, sectionKey).findMany({
      where: { documentId },
      orderBy: { sequence: 'asc' },
    });
    out[sectionKey] = rows as unknown[];
  }
  return out;
}

function movementDelegateFull(
  tx: unknown,
  register: AccumulationRegisterConfig,
): PrismaMovementFull {
  const snake = `movement_${register.module}_${register.name}`;
  const camel = `movement${capitalize(register.module)}${capitalize(register.name)}`;
  const bag = tx as Record<string, PrismaMovementFull | undefined>;
  const d = bag[snake] ?? bag[camel];
  if (!d) throw new Error(`movementDelegateFull: no Prisma model for ${snake}`);
  return d;
}

type PrismaInformationRegisterTable = {
  createMany: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<unknown>;
};

function registerTableDelegate(
  tx: unknown,
  register: InformationRegisterConfig,
): PrismaInformationRegisterTable {
  const snake = `register_${register.module}_${register.name}`;
  const camel = `register${capitalize(register.module)}${capitalize(register.name)}`;
  const bag = tx as Record<string, PrismaInformationRegisterTable | undefined>;
  const d = bag[snake] ?? bag[camel];
  if (!d) throw new Error(`registerTableDelegate: no Prisma model for ${snake}`);
  return d;
}

function resolveAnyRegister(id: string): RegisterConfig {
  const reg = getRegistry().register[id];
  if (!reg) throw new Error(`posting: register "${id}" not registered`);
  return reg;
}

function resolveAccumulationRegister(id: string): AccumulationRegisterConfig {
  const reg = getRegistry().accumulationRegister[id];
  if (!reg)
    throw new Error(
      `posting: accumulation register "${id}" not registered (information registers do not expose balance helpers)`,
    );
  return reg;
}

/**
 * Serialize concurrent posts within a tenant+register key by acquiring a
 * transaction-scoped advisory lock. The lock is released at tx commit/rollback.
 */
async function acquireAdvisoryLock(tx: unknown, key: string): Promise<void> {
  const bag = tx as { $executeRawUnsafe: (sql: string, ...args: unknown[]) => Promise<number> };
  await bag.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', key);
}

/**
 * Runs validators + mappers + writes movement rows for a single document.
 * No lock acquisition, no period check, no status transition, no audit.
 * Assumes the caller already loaded `doc` (header + lines merged) and opened a
 * tx within the tenant. Returns the count of movement rows written.
 *
 * Used by:
 *   - postDocument (normal happy path)
 *   - scripts/backfill-stock-cost.ts (replaying historical POSTED docs)
 */
export async function replayPosting(
  tx: unknown,
  ctx: AppContext,
  config: DocumentConfig,
  doc: DocumentRowWithLines,
  docId: string,
): Promise<{ movementCount: number }> {
  if (!ctx.tenant) throw new Error('replayPosting: no tenant in context');
  const tenantId = ctx.tenant.id;

  const pCtx: PostingContext = {
    tx,
    register(regId: string) {
      const register = resolveAccumulationRegister(regId);
      return {
        balance: (filter: Record<string, unknown>) => registerBalance(tx, register, filter),
        balanceAll: (filter: Record<string, unknown>) => registerBalanceAll(tx, register, filter),
      };
    },
  };

  // Execute prePost validators.
  for (const validator of config.validators?.prePost ?? []) {
    const result = await validator(doc as Record<string, unknown>, pCtx);
    if (!result.ok) {
      throw new PostingValidationError(config.id, docId, result.message);
    }
  }

  // Produce movements per register.
  const registerIds = Object.keys(config.posting).sort();
  let movementCount = 0;
  for (const regId of registerIds) {
    const register = resolveAnyRegister(regId);
    const postingFn = config.posting[regId];
    if (!postingFn) continue;
    const rows = (await postingFn(doc as Record<string, unknown>, pCtx)) as Array<
      Record<string, unknown>
    >;
    if (rows.length === 0) continue;

    if (isAccumulationRegister(register)) {
      const data = rows.map((m) => ({ tenantId, docRef: docId, docType: config.id, ...m }));
      await movementDelegateFull(tx, register).createMany({ data });
      movementCount += rows.length;
      continue;
    }

    if (isInformationRegister(register)) {
      const data = rows.map((m) => ({
        tenantId,
        docRef: docId,
        recorderType: config.id,
        ...m,
      }));
      await registerTableDelegate(tx, register).createMany({ data });
      movementCount += rows.length;
      continue;
    }

    // exhaustiveness — unreachable if the union ever expands without an update.
    throw new Error(`posting: unknown register kind for "${regId}"`);
  }

  return { movementCount };
}

export async function postDocument(
  ctx: AppContext,
  config: DocumentConfig,
  id: string,
): Promise<{ movementCount: number }> {
  if (ctx.viewAsRole) throw new ViewAsReadOnlyError(ctx.viewAsRole);
  checkDoc(ctx, config, 'post');
  if (!ctx.tenant) throw new Error('postDocument: no tenant in context');
  const tenantId = ctx.tenant.id;
  const userId = ctx.user.id;

  // Plan-limit guard. Throws PlanLimitError when MODE=on and the tenant is at
  // or above its monthly posted-doc ceiling; route layer maps to 402.
  await enforcePlanLimit(ctx.tenant, { kind: 'post_document' });

  const result = await withTenant(
    tenantId,
    async (tx) => {
      // Acquire locks in canonical (sorted) order to avoid cross-register deadlocks.
      const registerIds = Object.keys(config.posting).sort();
      for (const regId of registerIds) {
        await acquireAdvisoryLock(tx, `${tenantId}:${regId}`);
      }

      const docHeader = (await docDelegate(tx, config).findUnique({ where: { id } })) as
        | (Record<string, unknown> & { status: string; version: number })
        | null;
      if (!docHeader) throw new NotFoundError(config.id, id);
      if (!scopeMatches(ctx, config, docHeader)) throw new NotFoundError(config.id, id);
      if (docHeader.status !== 'SAVED') {
        throw new InvalidStatusError(config.id, id, docHeader.status, 'post');
      }
      await assertPeriodOpen(ctx, docHeader.date as Date, tx, config.module);
      const lines = await loadLinesForPosting(tx, config, id);
      const doc: DocumentRowWithLines = lines ? { ...docHeader, lines } : docHeader;

      const { movementCount } = await replayPosting(tx, ctx, config, doc, id);

      // Transition document status.
      await docDelegate(tx, config).update({
        where: { id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
          postedBy: userId,
          version: { increment: 1 },
        },
      });

      await writeAudit(tx, ctx, {
        entity: `document.${config.module}.${config.name}`,
        entityId: id,
        action: 'post',
      });

      return { movementCount };
    },
    { isolationLevel: 'Serializable' },
  );

  // Fire-and-forget push. Never block the posting response on delivery.
  void sendPushToUser(ctx, {
    title: 'Document posted',
    body: `${config.id} ${id}`,
    data: { event: `${config.id}.posted`, docId: id, docType: config.id },
  });

  return result;
}

export async function unpostDocument(
  ctx: AppContext,
  config: DocumentConfig,
  id: string,
): Promise<{ deactivatedCount: number }> {
  if (ctx.viewAsRole) throw new ViewAsReadOnlyError(ctx.viewAsRole);
  checkDoc(ctx, config, 'unpost');
  if (!ctx.tenant) throw new Error('unpostDocument: no tenant in context');
  const tenantId = ctx.tenant.id;

  return withTenant(
    tenantId,
    async (tx) => {
      const registerIds = Object.keys(config.posting).sort();
      for (const regId of registerIds) {
        await acquireAdvisoryLock(tx, `${tenantId}:${regId}`);
      }

      const doc = (await docDelegate(tx, config).findUnique({ where: { id } })) as
        | (Record<string, unknown> & { status: string })
        | null;
      if (!doc) throw new NotFoundError(config.id, id);
      if (!scopeMatches(ctx, config, doc)) throw new NotFoundError(config.id, id);
      if (doc.status !== 'POSTED') {
        throw new InvalidStatusError(config.id, id, doc.status, 'unpost');
      }
      await assertPeriodOpen(ctx, doc.date as Date, tx, config.module);

      let deactivatedCount = 0;
      for (const regId of registerIds) {
        const register = resolveAnyRegister(regId);

        if (isAccumulationRegister(register)) {
          const delegate = movementDelegateFull(tx, register);
          const result = (await delegate.updateMany({
            where: { docRef: id, docType: config.id, active: true },
            data: { active: false },
          })) as { count: number };
          deactivatedCount += result.count;
          continue;
        }

        if (isInformationRegister(register)) {
          const delegate = registerTableDelegate(tx, register);
          const result = (await delegate.updateMany({
            where: { docRef: id, deletedAt: null },
            data: { deletedAt: new Date() },
          })) as { count: number };
          deactivatedCount += result.count;
          continue;
        }

        throw new Error(`unposting: unknown register kind for "${regId}"`);
      }

      await docDelegate(tx, config).update({
        where: { id },
        data: { status: 'SAVED', postedAt: null, postedBy: null },
      });

      await writeAudit(tx, ctx, {
        entity: `document.${config.module}.${config.name}`,
        entityId: id,
        action: 'unpost',
      });

      return { deactivatedCount };
    },
    { isolationLevel: 'Serializable' },
  );
}

export { movementDelegate };
