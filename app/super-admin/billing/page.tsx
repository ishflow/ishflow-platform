import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import {
  type SubscriptionFeatureState,
  getSubscriptionFeatureState,
} from '@/platform/billing/feature-state';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { updateGlobalBillingGate } from './actions';

export const dynamic = 'force-dynamic';

const STATE_KEYS: ReadonlyArray<SubscriptionFeatureState> = ['enabled', 'disabled', 'hidden'];

export default async function SuperAdminBillingPage() {
  await assertSuperAdmin();
  const [current, dict] = await Promise.all([getSubscriptionFeatureState(), getSuperAdminDict()]);
  const b = dict.billing;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{b.title}</h1>
        <p className="text-sm text-muted-foreground">{b.subtitle}</p>
      </header>

      <form action={updateGlobalBillingGate}>
        <Card>
          <CardHeader>
            <CardTitle>{b.cardTitle}</CardTitle>
            <CardDescription>{b.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div>
              <Badge variant="outline">
                {b.currentLabel}{' '}
                <strong className="ml-1 font-semibold">{b.states[current].label}</strong>
              </Badge>
            </div>
            <RadioGroup name="state" defaultValue={current} className="gap-3">
              {STATE_KEYS.map((key) => {
                const id = `gate-${key}`;
                const isCurrent = key === current;
                const { label, description } = b.states[key];
                return (
                  <Label
                    key={key}
                    htmlFor={id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40 has-data-checked:border-primary has-data-checked:bg-muted/40"
                  >
                    <RadioGroupItem id={id} value={key} className="mt-0.5" />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{label}</span>
                        {isCurrent ? (
                          <Badge variant="secondary" className="text-xs">
                            {b.currentTag}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit">{b.apply}</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
