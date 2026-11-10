/**
 * Audit pro CSV export endpoint. Mirrors the page query-string so any
 * filter combination can be exported by appending `/export?` + the same
 * params the page reads.
 *
 * Capped at 5,000 rows inside `exportAuditCsv`; if the operator needs more
 * they should refine the filter or run the metrics cron offline.
 */

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { exportAuditCsv } from '@/platform/super-admin/audit-pro/list-audit-pro';
import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function param(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key);
  return value?.trim() ? value.trim() : undefined;
}

export async function GET(req: Request) {
  const ctx = await assertSuperAdmin();
  const url = new URL(req.url);
  const filters = {
    action: param(url, 'action'),
    actorClerkId: param(url, 'actorClerkId'),
    tenantId: param(url, 'tenantId'),
    entity: param(url, 'entity'),
    category: param(url, 'category'),
    q: param(url, 'q'),
    from: param(url, 'from'),
    to: param(url, 'to'),
  };

  const csv = await exportAuditCsv(filters);
  const h = await headers();
  await withBypass((tx) =>
    tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: 'audit.csv_exported',
        before: Prisma.JsonNull,
        after: { filters, bytes: csv.length },
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    }),
  );

  const filename = `platform-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
