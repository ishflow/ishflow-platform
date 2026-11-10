import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { withTenant } from '@/platform/db/tenant-context';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getTenantDebug } from '@/platform/super-admin/tenant-detail';

export const dynamic = 'force-dynamic';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function rlsProbe(
  tenantId: string,
): Promise<{ ok: boolean; role: string | null; error: string | null }> {
  try {
    const role = await withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ current_user: string }>>('SELECT current_user');
      return rows[0]?.current_user ?? null;
    });
    return { ok: true, role, error: null };
  } catch (e) {
    return {
      ok: false,
      role: null,
      error: e instanceof Error ? e.message : 'unknown error',
    };
  }
}

export default async function TenantDebugPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [debug, rls, dict] = await Promise.all([
    getTenantDebug(tenantId),
    rlsProbe(tenantId),
    getSuperAdminDict(),
  ]);

  const d = dict.tenantDetail.debug;
  const c = dict.common;
  const dash = c.dash;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{d.tablesTitle.replace('{count}', String(debug.tables.length))}</CardTitle>
        </CardHeader>
        <CardContent>
          {debug.tables.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{d.tablesEmpty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{d.tableColumns.table}</TableHead>
                  <TableHead className="text-right">{d.tableColumns.rows}</TableHead>
                  <TableHead className="text-right">{d.tableColumns.size}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debug.tables.map((t) => (
                  <TableRow key={t.table}>
                    <TableCell className="font-mono text-xs">{t.table}</TableCell>
                    <TableCell className="text-right font-mono">
                      {t.rowCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatBytes(t.sizeBytes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{d.healthTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{d.healthColumns.check}</TableHead>
                <TableHead>{d.healthColumns.result}</TableHead>
                <TableHead className="text-right">{d.healthColumns.details}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{d.membershipsCheck}</TableCell>
                <TableCell>
                  <Badge variant={debug.membershipCount > 0 ? 'default' : 'secondary'}>
                    {debug.membershipCount > 0 ? c.pass : c.empty}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{debug.membershipCount}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{d.totalFootprint}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{c.info}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatBytes(debug.totalBytes)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{d.rlsCheck}</TableCell>
                <TableCell>
                  <Badge variant={rls.ok ? 'default' : 'destructive'}>
                    {rls.ok ? c.pass : c.fail}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {rls.ok ? (rls.role ?? dash) : (rls.error ?? dash)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
