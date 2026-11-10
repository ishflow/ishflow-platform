import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { type AddonKey, getAddonEntry, isAddonKey } from '@/platform/addons/catalog';
import { getAddonLabels } from '@/platform/addons/catalog-i18n';
import { Link } from '@/platform/i18n/navigation';
import type { AddonSpotlightContent } from '@/platform/marketing/types';
import {
  Banknote,
  Barcode,
  Building2,
  FileSignature,
  FileText,
  Landmark,
  type LucideIcon,
  MessageCircleQuestion,
  Printer,
  QrCode,
  ScanText,
  Send,
  ShoppingCart,
  UsersRound,
} from 'lucide-react';
import { FadeIn } from '../fade-in';

const ICONS: Record<string, LucideIcon> = {
  'scan-text': ScanText,
  landmark: Landmark,
  printer: Printer,
  'qr-code': QrCode,
  'file-signature': FileSignature,
  'file-text': FileText,
  send: Send,
  barcode: Barcode,
  'shopping-cart': ShoppingCart,
  'building-2': Building2,
  'users-round': UsersRound,
  'message-circle-question': MessageCircleQuestion,
  banknote: Banknote,
};

interface AddonSpotlightProps {
  content: AddonSpotlightContent;
  locale: string;
}

export function AddonSpotlight({ content, locale }: AddonSpotlightProps) {
  const items = content.items.filter((it): it is { addonKey: AddonKey; badge?: string } =>
    isAddonKey(it.addonKey),
  );

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <FadeIn>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {content.headline}
            </h2>
          </FadeIn>
          <FadeIn delay={0.05}>
            <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
              {content.body}
            </p>
          </FadeIn>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, idx) => {
            const entry = getAddonEntry(item.addonKey);
            const labels = getAddonLabels(item.addonKey, locale);
            const Icon = ICONS[entry.iconKey] ?? ScanText;
            return (
              <FadeIn key={item.addonKey} delay={Math.min(idx * 0.05, 0.3)}>
                <Link href={`/integrations/${addonSlug(item.addonKey)}`}>
                  <Card className="group h-full border-border/60 bg-card/60 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
                    <CardContent className="flex h-full flex-col gap-4 p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                          <Icon className="size-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <Badge variant="secondary" className="rounded-full">
                              {item.badge}
                            </Badge>
                          )}
                          <StatusBadge status={entry.status} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold tracking-tight">{labels.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{labels.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: 'ga' | 'beta' | 'planned' }) {
  const styles: Record<string, string> = {
    ga: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    beta: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    planned: 'bg-muted text-muted-foreground',
  };
  const labels: Record<string, string> = {
    ga: 'GA',
    beta: 'Beta',
    planned: 'Soon',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function addonSlug(key: AddonKey): string {
  const entry = getAddonEntry(key);
  // catalog.navHref is /addons/<slug> in the platform; strip prefix and reuse the slug
  return entry.navHref.replace('/addons/', '');
}
