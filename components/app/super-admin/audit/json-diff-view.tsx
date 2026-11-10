import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type DiffEntry, hasChanges, jsonDiff } from '@/platform/super-admin/audit-pro/json-diff';
import type { SuperAdminProDict } from '@/platform/super-admin/pro-messages';

function formatValue(value: unknown, dash: string): string {
  if (value === undefined) return dash;
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function kindClass(kind: DiffEntry['kind']): string {
  switch (kind) {
    case 'added':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'removed':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'changed':
      return 'bg-accent text-accent-foreground border-accent';
    default:
      return 'bg-muted text-muted-foreground border-transparent';
  }
}

function rowBgClass(kind: DiffEntry['kind']): string {
  if (kind === 'added') return 'bg-primary/5';
  if (kind === 'removed') return 'bg-destructive/5';
  if (kind === 'changed') return 'bg-accent/40';
  return '';
}

interface JsonDiffViewProps {
  before: unknown;
  after: unknown;
  dict: SuperAdminProDict['audit']['diff'];
  dash: string;
}

export function JsonDiffView({ before, after, dict, dash }: JsonDiffViewProps) {
  const entries = jsonDiff(before, after);
  const changed = hasChanges(entries);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className={kindClass('added')}>
            {dict.addedLegend}
          </Badge>
          <Badge variant="outline" className={kindClass('removed')}>
            {dict.removedLegend}
          </Badge>
          <Badge variant="outline" className={kindClass('changed')}>
            {dict.changedLegend}
          </Badge>
          <Badge variant="outline" className={kindClass('unchanged')}>
            {dict.unchangedLegend}
          </Badge>
        </div>

        {!changed ? (
          <p className="text-sm text-muted-foreground">{dict.noChanges}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full table-fixed text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-[28%] px-3 py-2 text-left font-mono text-muted-foreground">
                    path
                  </th>
                  <th className="w-[10%] px-3 py-2 text-left font-mono text-muted-foreground">Δ</th>
                  <th className="w-[31%] px-3 py-2 text-left font-mono text-muted-foreground">
                    before
                  </th>
                  <th className="w-[31%] px-3 py-2 text-left font-mono text-muted-foreground">
                    after
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .filter((e) => e.kind !== 'unchanged')
                  .map((e, idx) => (
                    <tr
                      key={`${e.path}-${idx}`}
                      className={cn('border-b last:border-b-0', rowBgClass(e.kind))}
                    >
                      <td className="break-all px-3 py-2 align-top font-mono text-foreground">
                        {e.path || '·'}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Badge variant="outline" className={kindClass(e.kind)}>
                          {e.kind}
                        </Badge>
                      </td>
                      <td className="break-all px-3 py-2 align-top font-mono text-muted-foreground">
                        {formatValue(e.before, dash)}
                      </td>
                      <td className="break-all px-3 py-2 align-top font-mono text-foreground">
                        {formatValue(e.after, dash)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
