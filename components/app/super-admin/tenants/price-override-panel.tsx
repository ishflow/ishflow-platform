import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TenantProDict } from '@/platform/super-admin/tenants/dict';
import type { TenantPriceOverride } from '@prisma/client';

interface Props {
  tenantId: string;
  override: TenantPriceOverride | null;
  dict: TenantProDict['overrides']['priceOverride'];
  saveAction: (formData: FormData) => Promise<void>;
  removeAction: (formData: FormData) => Promise<void>;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().slice(0, 16);
}

export function PriceOverridePanel({ tenantId, override, dict, saveAction, removeAction }: Props) {
  const currentAmount = override ? Number(override.monthlyPriceUsd).toFixed(2) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {currentAmount ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{dict.currentLine.replace('{amount}', currentAmount)}</p>
            {override?.reason && (
              <p className="text-muted-foreground text-xs mt-1">{override.reason}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{dict.empty}</p>
        )}

        <form action={saveAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price-monthly">{dict.monthlyLabel}</Label>
            <Input
              id="price-monthly"
              name="monthlyPriceUsd"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder={dict.monthlyPlaceholder}
              defaultValue={currentAmount ?? ''}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price-expires">{dict.expiresLabel}</Label>
            <Input
              id="price-expires"
              name="effectiveUntil"
              type="datetime-local"
              defaultValue={formatDate(override?.effectiveUntil ?? null)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="price-reason">{dict.reasonLabel}</Label>
            <Input
              id="price-reason"
              name="reason"
              placeholder={dict.reasonPlaceholder}
              defaultValue={override?.reason ?? ''}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" size="sm">
              {dict.saveButton}
            </Button>
          </div>
        </form>

        {override && (
          <form action={removeAction} className="flex justify-end">
            <input type="hidden" name="tenantId" value={tenantId} />
            <Button type="submit" variant="ghost" size="sm">
              {dict.removeButton}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
