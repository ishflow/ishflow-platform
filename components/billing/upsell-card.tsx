import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/platform/i18n/navigation';
import type { TenantPlan } from '@prisma/client';
import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export type UpsellFeature =
  | 'advancedReports'
  | 'periodClose'
  | 'apiAccess'
  | 'customBranding'
  | 'sso';

interface UpsellCardProps {
  feature: UpsellFeature;
  upgradeTo: TenantPlan;
}

export async function UpsellCard({ feature, upgradeTo }: UpsellCardProps) {
  const t = await getTranslations('billing.featureGate');
  const tBilling = await getTranslations('billing');

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="size-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{tBilling('locked')}</span>
        </div>
        <CardTitle>{t(`${feature}.title`)}</CardTitle>
        <CardDescription>{t(`${feature}.body`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {tBilling('upgradeHint', { plan: upgradeTo })}
        </p>
        <Link href={`/admin/billing?action=upgrade&plan=${upgradeTo}`} className="self-start">
          <Button>{t(`${feature}.upgradeCta`)}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
