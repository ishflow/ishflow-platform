import { withBypass } from '@/platform/db/tenant-context';
import { Prisma, type Tenant } from '@prisma/client';

const HARD_DELETE_MIN_DAYS = 30;

export class TenantOpError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'tenant_not_found'
      | 'already_suspended'
      | 'not_suspended'
      | 'already_archived'
      | 'not_archived'
      | 'restore_window_expired'
      | 'hard_delete_too_early'
      | 'slug_mismatch'
      | 'user_not_found'
      | 'membership_missing',
  ) {
    super(message);
    this.name = 'TenantOpError';
  }
}

interface ActorEnvelope {
  actorUserId: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

/* ---------- suspend / lift ---------- */

export interface SuspendTenantInput extends ActorEnvelope {
  tenantId: string;
  reason: string;
}

export async function suspendTenant(input: SuspendTenantInput): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new TenantOpError('tenant not found', 'tenant_not_found');
    if (tenant.status === 'suspended') {
      throw new TenantOpError('tenant already suspended', 'already_suspended');
    }

    const before = { status: tenant.status };

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { status: 'suspended' },
    });

    await tx.tenantSuspension.upsert({
      where: { tenantId: input.tenantId },
      create: {
        tenantId: input.tenantId,
        reason: input.reason,
        suspendedBy: input.actorUserId,
        suspendedAt: new Date(),
        liftedAt: null,
        liftedBy: null,
      },
      update: {
        reason: input.reason,
        suspendedBy: input.actorUserId,
        suspendedAt: new Date(),
        liftedAt: null,
        liftedBy: null,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.suspended',
        tenantId: input.tenantId,
        before: before as Prisma.InputJsonValue,
        after: { status: 'suspended', reason: input.reason } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}

export interface LiftSuspensionInput extends ActorEnvelope {
  tenantId: string;
}

export async function liftTenantSuspension(input: LiftSuspensionInput): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new TenantOpError('tenant not found', 'tenant_not_found');
    if (tenant.status !== 'suspended') {
      throw new TenantOpError('tenant not suspended', 'not_suspended');
    }

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { status: 'active' },
    });

    await tx.tenantSuspension.update({
      where: { tenantId: input.tenantId },
      data: {
        liftedAt: new Date(),
        liftedBy: input.actorUserId,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.suspension_lifted',
        tenantId: input.tenantId,
        before: { status: 'suspended' } as Prisma.InputJsonValue,
        after: { status: 'active' } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}

/* ---------- archive / restore / hard-delete ---------- */

export interface ArchiveTenantInput extends ActorEnvelope {
  tenantId: string;
}

export async function archiveTenant(input: ArchiveTenantInput): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new TenantOpError('tenant not found', 'tenant_not_found');
    if (tenant.deletedAt) {
      throw new TenantOpError('tenant already archived', 'already_archived');
    }

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { deletedAt: new Date(), archivedBy: input.actorUserId },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.archived',
        tenantId: input.tenantId,
        before: { deletedAt: null } as Prisma.InputJsonValue,
        after: { deletedAt: new Date().toISOString() } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}

export interface RestoreTenantInput extends ActorEnvelope {
  tenantId: string;
}

export async function restoreTenant(input: RestoreTenantInput): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new TenantOpError('tenant not found', 'tenant_not_found');
    if (!tenant.deletedAt) {
      throw new TenantOpError('tenant not archived', 'not_archived');
    }
    const ageDays = (Date.now() - tenant.deletedAt.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays > HARD_DELETE_MIN_DAYS) {
      throw new TenantOpError('restore window expired', 'restore_window_expired');
    }

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { deletedAt: null, archivedBy: null },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.restored',
        tenantId: input.tenantId,
        before: { deletedAt: tenant.deletedAt.toISOString() } as Prisma.InputJsonValue,
        after: { deletedAt: null } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}

export interface HardDeleteTenantInput extends ActorEnvelope {
  tenantId: string;
  /** Operator must retype the tenant.slug to confirm. */
  confirmSlug: string;
  /** Allow operator to override the 30-day archived window for known cases. */
  bypassWindow?: boolean;
}

/**
 * Permanent tenant deletion. Requires either 30 days archived or an
 * explicit `bypassWindow` flag, AND a matching slug confirmation.
 *
 * Schema FK cascades remove all tenant-keyed rows (memberships, audit,
 * documents, lines, registers, ...). We delete the `Tenant` row directly
 * and let Postgres do the heavy lifting.
 */
export async function hardDeleteTenant(input: HardDeleteTenantInput): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new TenantOpError('tenant not found', 'tenant_not_found');
    if (tenant.slug !== input.confirmSlug) {
      throw new TenantOpError('slug mismatch', 'slug_mismatch');
    }

    if (!input.bypassWindow) {
      if (!tenant.deletedAt) {
        throw new TenantOpError('tenant not archived', 'not_archived');
      }
      const ageDays = (Date.now() - tenant.deletedAt.getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays < HARD_DELETE_MIN_DAYS) {
        throw new TenantOpError('hard delete blocked: archive too recent', 'hard_delete_too_early');
      }
    }

    // Audit log row goes in BEFORE the tenant is removed; PlatformAuditLog
    // has no FK back to Tenant so the row outlives the deletion.
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.hard_deleted',
        tenantId: input.tenantId,
        before: {
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
          deletedAt: tenant.deletedAt?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
        after: Prisma.JsonNull,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });

    await tx.tenant.delete({ where: { id: input.tenantId } });
  });
}

/* ---------- transfer ownership ---------- */

export interface TransferTenantOwnershipInput extends ActorEnvelope {
  tenantId: string;
  /** Internal `user.id` to receive ownership. Must already have a membership in the tenant. */
  newOwnerUserId: string;
}

/**
 * Move the `owner` system role membership to a new user. The previous
 * owner keeps their other roles but loses owner. If the previous owner
 * had no other roles, the membership row is preserved (we only swap the
 * roles array) — operator can soft-remove them via the Users tab.
 */
export async function transferTenantOwnership(input: TransferTenantOwnershipInput): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new TenantOpError('tenant not found', 'tenant_not_found');

    const targetUser = await tx.user.findUnique({ where: { id: input.newOwnerUserId } });
    if (!targetUser) throw new TenantOpError('user not found', 'user_not_found');

    const ownerRole = await tx.role.findFirst({
      where: { tenantId: input.tenantId, name: 'owner', isSystem: true },
    });
    if (!ownerRole) throw new TenantOpError('owner role missing', 'membership_missing');

    const targetMembership = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId: input.tenantId, userId: input.newOwnerUserId } },
      include: { roles: true },
    });
    if (!targetMembership) {
      throw new TenantOpError('target user is not a member', 'membership_missing');
    }

    const currentOwnerMemberships = await tx.membership.findMany({
      where: {
        tenantId: input.tenantId,
        roles: { some: { id: ownerRole.id } },
      },
      include: { user: { select: { id: true, email: true } } },
    });

    for (const m of currentOwnerMemberships) {
      if (m.userId === input.newOwnerUserId) continue;
      await tx.membership.update({
        where: { id: m.id },
        data: { roles: { disconnect: [{ id: ownerRole.id }] } },
      });
    }

    if (!targetMembership.roles.some((r) => r.id === ownerRole.id)) {
      await tx.membership.update({
        where: { id: targetMembership.id },
        data: { roles: { connect: [{ id: ownerRole.id }] } },
      });
    }

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.ownership_transferred',
        tenantId: input.tenantId,
        before: {
          previousOwners: currentOwnerMemberships.map((m) => ({
            userId: m.user.id,
            email: m.user.email,
          })),
        } as Prisma.InputJsonValue,
        after: {
          newOwnerUserId: input.newOwnerUserId,
          newOwnerEmail: targetUser.email,
        } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}

/* ---------- wipe transactional data ---------- */

export interface WipeTenantDataInput extends ActorEnvelope {
  tenantId: string;
  confirmSlug: string;
}

/**
 * Remove all transactional rows for one tenant — every `document_*`,
 * `document_line_*`, and `register_*` (movement) table — while preserving
 * the catalog data, memberships, and settings.
 *
 * Implemented via dynamic table discovery against `information_schema`
 * so newly-generated entities are included automatically.
 */
export async function wipeTenantData(input: WipeTenantDataInput): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new TenantOpError('tenant not found', 'tenant_not_found');
    if (tenant.slug !== input.confirmSlug) {
      throw new TenantOpError('slug mismatch', 'slug_mismatch');
    }

    const tables = await tx.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND (table_name LIKE 'document_line_%'
              OR table_name LIKE 'document_%'
              OR table_name LIKE 'register_%')
       ORDER BY
         CASE
           WHEN table_name LIKE 'document_line_%' THEN 1
           WHEN table_name LIKE 'document_%' THEN 2
           WHEN table_name LIKE 'register_%' THEN 3
         END,
         table_name`,
    );

    let totalDeleted = 0;
    for (const { table_name } of tables) {
      try {
        const result = await tx.$executeRawUnsafe(
          `DELETE FROM ${table_name} WHERE tenant_id = $1::uuid`,
          input.tenantId,
        );
        totalDeleted += Number(result ?? 0);
      } catch {
        // Some tables in the prefix may lack `tenant_id`; skip.
      }
    }

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.data_wiped',
        tenantId: input.tenantId,
        before: Prisma.JsonNull,
        after: { totalDeleted, tableCount: tables.length } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}

/* ---------- export ---------- */

export interface TenantExportPayload {
  tenant: Tenant;
  memberships: Array<{
    id: string;
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    roles: string[];
    createdAt: Date;
  }>;
  catalogs: Record<string, unknown[]>;
  documents: Record<string, unknown[]>;
  documentLines: Record<string, unknown[]>;
  auditLog: unknown[];
}

/**
 * Produce a serializable snapshot of a tenant — used for support
 * exports and pre-deletion backups. Tables are discovered dynamically
 * (catalog_*, document_*, document_line_*) and filtered by tenantId.
 */
export async function exportTenantSnapshot(
  tenantId: string,
  actor: ActorEnvelope,
): Promise<TenantExportPayload> {
  return withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new TenantOpError('tenant not found', 'tenant_not_found');

    const memberships = await tx.membership.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        roles: { select: { name: true } },
      },
    });

    const tables = await tx.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND (table_name LIKE 'catalog_%'
              OR table_name LIKE 'document_%'
              OR table_name LIKE 'document_line_%')
       ORDER BY table_name`,
    );

    const catalogs: Record<string, unknown[]> = {};
    const documents: Record<string, unknown[]> = {};
    const documentLines: Record<string, unknown[]> = {};

    for (const { table_name } of tables) {
      try {
        const rows = await tx.$queryRawUnsafe<unknown[]>(
          `SELECT * FROM ${table_name} WHERE tenant_id = $1::uuid LIMIT 10000`,
          tenantId,
        );
        if (table_name.startsWith('catalog_')) catalogs[table_name] = rows;
        else if (table_name.startsWith('document_line_')) documentLines[table_name] = rows;
        else if (table_name.startsWith('document_')) documents[table_name] = rows;
      } catch {
        // table without tenant_id — skip silently
      }
    }

    const auditLog = await tx.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: actor.actorClerkId,
        action: 'tenant.exported',
        tenantId,
        before: Prisma.JsonNull,
        after: {
          membershipCount: memberships.length,
          tableCount: tables.length,
        } as Prisma.InputJsonValue,
        ip: actor.ip,
        userAgent: actor.userAgent,
      },
    });

    return {
      tenant,
      memberships: memberships.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        roles: m.roles.map((r) => r.name),
        createdAt: m.createdAt,
      })),
      catalogs,
      documents,
      documentLines,
      auditLog,
    };
  });
}
