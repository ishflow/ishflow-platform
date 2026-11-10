import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TenantProDict } from '@/platform/super-admin/tenants/dict';
import type { TimelineEntry } from '@/platform/super-admin/tenants/timeline';

interface Props {
  entries: ReadonlyArray<TimelineEntry>;
  dict: TenantProDict['timeline'];
}

function badgeVariant(
  kind: TimelineEntry['kind'],
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (kind) {
    case 'billing':
      return 'default';
    case 'platform_audit':
      return 'secondary';
    case 'addon_toggle':
      return 'outline';
    case 'suspension':
      return 'destructive';
    case 'status_change':
      return 'outline';
  }
}

function formatTime(d: Date): string {
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export function TimelineList({ entries, dict }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.empty}</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{dict.columns.when}</TableHead>
                  <TableHead>{dict.columns.kind}</TableHead>
                  <TableHead>{dict.columns.label}</TableHead>
                  <TableHead>{dict.columns.actor}</TableHead>
                  <TableHead>{dict.columns.detail}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatTime(e.at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(e.kind)}>{dict.kinds[e.kind]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.label}</TableCell>
                    <TableCell className="font-mono text-xs">{e.actor ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
