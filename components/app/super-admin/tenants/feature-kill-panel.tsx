import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TenantProDict } from '@/platform/super-admin/tenants/dict';
import type { TenantFeatureKill } from '@prisma/client';

interface Props {
  tenantId: string;
  kills: ReadonlyArray<TenantFeatureKill>;
  dict: TenantProDict['overrides']['featureKill'];
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (formData: FormData) => Promise<void>;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function FeatureKillPanel({ tenantId, kills, dict, addAction, removeAction }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {kills.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.empty}</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.columns.key}</TableHead>
                  <TableHead>{dict.columns.reason}</TableHead>
                  <TableHead>{dict.columns.killedAt}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {kills.map((k) => (
                  <TableRow key={`${k.tenantId}:${k.featureKey}`}>
                    <TableCell className="font-mono text-xs">{k.featureKey}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.reason ?? ''}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(k.killedAt)}</TableCell>
                    <TableCell className="text-right">
                      <form action={removeAction}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="featureKey" value={k.featureKey} />
                        <Button type="submit" variant="ghost" size="sm">
                          {dict.removeButton}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <form action={addAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fk-key">{dict.keyLabel}</Label>
            <Input
              id="fk-key"
              name="featureKey"
              placeholder={dict.keyPlaceholder}
              required
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fk-reason">{dict.reasonLabel}</Label>
            <Input id="fk-reason" name="reason" placeholder={dict.reasonPlaceholder} />
          </div>
          <Button type="submit" size="sm">
            {dict.addButton}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
