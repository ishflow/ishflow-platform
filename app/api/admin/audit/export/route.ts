import { requireTenantContext } from '@/platform/auth/current-context';
import { prisma } from '@/platform/db';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';

export const dynamic = 'force-dynamic';

type AuditRow = {
  createdAt: Date;
  entity: string;
  entityId: string;
  action: string;
  userId: string | null;
};

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: AuditRow[], emailById: Map<string, string>): string {
  const header = ['createdAt', 'entity', 'entityId', 'action', 'user'].map(csvField).join(',');
  const body = rows
    .map((r) =>
      [
        r.createdAt.toISOString(),
        r.entity,
        r.entityId,
        r.action,
        r.userId ? (emailById.get(r.userId) ?? r.userId) : '',
      ]
        .map(csvField)
        .join(','),
    )
    .join('\n');
  return rows.length > 0 ? `${header}\n${body}` : header;
}

export async function GET(req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new Response('unauthorized', { status: 401 });
  }
  if (!hasPermission(ctx.permissions, 'admin.audit:read')) {
    return new Response('forbidden', { status: 403 });
  }

  const url = new URL(req.url);
  const entity = url.searchParams.get('entity') ?? '';
  const action = url.searchParams.get('action') ?? '';
  const q = url.searchParams.get('q')?.trim() ?? '';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const where: Record<string, unknown> = { tenantId: ctx.tenant.id };
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (q) {
    where.OR = [
      { entityId: { contains: q, mode: 'insensitive' } },
      { entity: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(`${from}T00:00:00Z`);
    if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
    where.createdAt = range;
  }

  const rows = await withTenant(ctx.tenant.id, (tx) =>
    tx.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      select: {
        createdAt: true,
        entity: true,
        entityId: true,
        action: true,
        userId: true,
      },
    }),
  );

  const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        })
      : [];
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const body = rowsToCsv(rows, emailById);

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-${ctx.tenant.id}-${Date.now()}.csv"`,
    },
  });
}
