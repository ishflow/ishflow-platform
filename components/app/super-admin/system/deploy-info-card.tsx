import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DeployInfo } from '@/platform/super-admin/system/deploy-info';

function row(label: string, value: string | null | undefined) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground">{value ?? '—'}</span>
    </div>
  );
}

export function DeployInfoCard({
  info,
  labels,
}: {
  info: DeployInfo;
  labels: {
    title: string;
    description: string;
    deploymentId: string;
    url: string;
    state: string;
    createdAt: string;
    gitSha: string;
    unavailable: string;
    fallbackReason: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!info.available ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <p className="text-foreground">{labels.unavailable}</p>
            {info.reason ? (
              <p className="mt-1 text-xs">
                {labels.fallbackReason.replace('{reason}', info.reason)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {row(labels.deploymentId, info.deploymentId)}
            {row(labels.url, info.url)}
            {row(labels.state, info.state)}
            {row(labels.createdAt, info.createdAt)}
            {row(labels.gitSha, info.gitSha)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
