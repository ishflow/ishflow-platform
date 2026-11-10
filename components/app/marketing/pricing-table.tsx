import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PLAN_DISPLAY_PRICES, type SupportedCurrency } from '@/platform/billing/display-prices';
import { PLAN_FEATURES, PLAN_LIMITS } from '@/platform/billing/plans';
import { Link } from '@/platform/i18n/navigation';
import type { TenantPlan } from '@prisma/client';
import { Check, X } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FadeIn } from './fade-in';

const PLAN_ORDER: TenantPlan[] = ['free', 'starter', 'pro', 'business', 'enterprise'];

interface PricingTableProps {
  locale: string;
  currency?: SupportedCurrency;
  highlighted?: TenantPlan;
}

export async function PricingTable({
  locale,
  currency = 'USD',
  highlighted = 'pro',
}: PricingTableProps) {
  const t = await getTranslations({ locale, namespace: 'marketing.pricing' });

  const cards = PLAN_ORDER.map((plan) => ({
    plan,
    price: PLAN_DISPLAY_PRICES[plan].month[currency],
    yearly: PLAN_DISPLAY_PRICES[plan].year[currency],
    limits: PLAN_LIMITS[plan],
    features: PLAN_FEATURES[plan],
    isHighlighted: plan === highlighted,
  }));

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {cards.map((c, idx) => (
            <FadeIn key={c.plan} delay={Math.min(idx * 0.05, 0.3)}>
              <Card
                className={cn(
                  'relative flex h-full flex-col gap-5 p-6',
                  c.isHighlighted
                    ? 'border-primary/50 bg-gradient-to-b from-primary/5 to-card shadow-lg shadow-primary/10'
                    : 'border-border/60 bg-card/60',
                )}
              >
                {c.isHighlighted && (
                  <Badge className="absolute right-4 top-4">{t('mostPopular')}</Badge>
                )}
                <div>
                  <h3 className="text-base font-semibold capitalize">
                    {t(`plans.${c.plan}.name`)}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(`plans.${c.plan}.tagline`)}
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight">{c.price}</div>
                  <div className="text-xs text-muted-foreground">{c.yearly}</div>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="size-4 text-primary mt-0.5" />
                    <span>
                      {t('limits.members', {
                        n: c.limits.members === Number.MAX_SAFE_INTEGER ? '∞' : c.limits.members,
                      })}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-4 text-primary mt-0.5" />
                    <span>
                      {t('limits.docs', {
                        n:
                          c.limits.monthlyPostedDocs === Number.MAX_SAFE_INTEGER
                            ? '∞'
                            : c.limits.monthlyPostedDocs.toLocaleString(),
                      })}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-4 text-primary mt-0.5" />
                    <span>
                      {t('limits.storage', {
                        gb:
                          c.limits.storageBytes === Number.MAX_SAFE_INTEGER
                            ? '∞'
                            : Math.round(c.limits.storageBytes / 1024 ** 3),
                      })}
                    </span>
                  </li>
                </ul>
                <div className="mt-auto pt-2">
                  {c.plan === 'enterprise' ? (
                    <Link
                      href="/contact"
                      className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                    >
                      {t('contactSales')}
                    </Link>
                  ) : (
                    <Link
                      href="/sign-up"
                      className={cn(
                        buttonVariants({
                          variant: c.isHighlighted ? 'default' : 'outline',
                        }),
                        'w-full',
                      )}
                    >
                      {c.plan === 'free' ? t('startFree') : t('startTrial')}
                    </Link>
                  )}
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>

        {/* Feature comparison */}
        <FadeIn delay={0.15}>
          <div className="mt-16 overflow-x-auto rounded-xl border border-border/60 bg-card/60">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                    {t('compare.feature')}
                  </th>
                  {PLAN_ORDER.map((p) => (
                    <th
                      key={p}
                      className={cn(
                        'px-4 py-3 text-center text-xs font-semibold uppercase',
                        p === highlighted ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {t(`plans.${p}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <ComparisonRow
                  label={t('compare.advancedReports')}
                  values={PLAN_ORDER.map((p) => PLAN_FEATURES[p].advancedReports)}
                />
                <ComparisonRow
                  label={t('compare.periodClose')}
                  values={PLAN_ORDER.map((p) => PLAN_FEATURES[p].periodClose)}
                />
                <ComparisonRow
                  label={t('compare.apiAccess')}
                  values={PLAN_ORDER.map((p) => PLAN_FEATURES[p].apiAccess)}
                />
                <ComparisonRow
                  label={t('compare.customBranding')}
                  values={PLAN_ORDER.map((p) => PLAN_FEATURES[p].customBranding)}
                />
                <ComparisonRow
                  label={t('compare.sso')}
                  values={PLAN_ORDER.map((p) => PLAN_FEATURES[p].sso)}
                />
                <ComparisonRow
                  label={t('compare.support')}
                  values={[
                    t('compare.supportEmail'),
                    t('compare.supportEmail'),
                    t('compare.supportPriority'),
                    t('compare.supportPriority'),
                    t('compare.supportDedicated'),
                  ]}
                />
              </tbody>
            </table>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

interface ComparisonRowProps {
  label: string;
  values: (boolean | string)[];
}

function ComparisonRow({ label, values }: ComparisonRowProps) {
  return (
    <tr>
      <td className="px-4 py-3 text-foreground">{label}</td>
      {values.map((v, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable column ordering, no inserts
        <td key={`col-${label}-${i}`} className="px-4 py-3 text-center">
          {typeof v === 'boolean' ? (
            v ? (
              <Check className="mx-auto size-4 text-primary" />
            ) : (
              <X className="mx-auto size-4 text-muted-foreground/40" />
            )
          ) : (
            <span className="text-xs text-muted-foreground">{v}</span>
          )}
        </td>
      ))}
    </tr>
  );
}
