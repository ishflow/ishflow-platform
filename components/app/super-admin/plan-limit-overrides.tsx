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
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import type { PlanLimitOverride } from '@prisma/client';

interface Props {
  tenantId: string;
  overrides: ReadonlyArray<PlanLimitOverride>;
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  dict: SuperAdminDict['subscription']['overrides'] & { delete: string; dash: string };
}

function formatDateTime(date: Date | null, dash: string): string {
  if (!date) return dash;
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export function PlanLimitOverrides({
  tenantId,
  overrides,
  createAction,
  deleteAction,
  dict,
}: Props) {
  const sorted = [...overrides].sort((a, b) => a.key.localeCompare(b.key));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.empty}</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.keyHeader}</TableHead>
                  <TableHead className="text-right">{dict.valueHeader}</TableHead>
                  <TableHead>{dict.expiresHeader}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((override) => (
                  <TableRow key={override.id}>
                    <TableCell className="font-mono text-xs">{override.key}</TableCell>
                    <TableCell className="text-right tabular-nums">{override.value}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(override.expiresAt, dict.dash)}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={deleteAction}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="id" value={override.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          {dict.delete}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <form
          action={createAction}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plo-key">{dict.keyLabel}</Label>
            <Input id="plo-key" name="key" placeholder={dict.keyPlaceholder} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plo-value">{dict.valueLabel}</Label>
            <Input
              id="plo-value"
              name="value"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder={dict.valuePlaceholder}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plo-expires">{dict.expiresLabel}</Label>
            <Input id="plo-expires" name="expiresAt" type="datetime-local" />
          </div>
          <Button type="submit" size="sm" className="sm:w-fit">
            {dict.addButton}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
