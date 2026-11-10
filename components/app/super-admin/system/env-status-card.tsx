import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EnvVarGroup } from '@/platform/super-admin/system/env-status';

export function EnvStatusCard({
  groups,
  labels,
}: {
  groups: ReadonlyArray<EnvVarGroup>;
  labels: {
    envTitle: string;
    envDescription: string;
    envConfigured: string;
    envMissing: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.envTitle}</CardTitle>
        <CardDescription>{labels.envDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.group} className="flex flex-col gap-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.group}
            </div>
            <ul className="divide-y divide-border">
              {group.items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-3 py-1.5 text-sm"
                >
                  <span className="font-mono text-xs text-foreground">{item.key}</span>
                  <Badge variant={item.configured ? 'outline' : 'destructive'}>
                    {item.configured ? labels.envConfigured : labels.envMissing}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
