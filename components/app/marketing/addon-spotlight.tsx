import { type AddonKey, getAddonEntry, isAddonKey } from '@/platform/addons/catalog';
import { getAddonLabels } from '@/platform/addons/catalog-i18n';
import { Link } from '@/platform/i18n/navigation';
import type { AddonSpotlightContent, AddonSpotlightItem } from '@/platform/marketing/types';
import { FadeIn } from './fade-in';
import {
  MARKETING_ICON_NAMES,
  MarketingIcon,
  type MarketingIconName,
} from './icons/marketing-icons';

interface AddonSpotlightProps {
  content: AddonSpotlightContent;
  locale: string;
}

// Map catalog iconKey strings (lucide-style) to MarketingIconName tokens.
const CATALOG_ICON_MAP: Record<string, MarketingIconName> = {
  'scan-text': 'doc',
  landmark: 'bank',
  printer: 'receipt',
  'qr-code': 'qr',
  'file-signature': 'doc',
  'file-text': 'doc',
  send: 'tg',
  barcode: 'qr',
  'shopping-cart': 'cash',
  'building-2': 'org',
  'users-round': 'users',
  'message-circle-question': 'headset',
  banknote: 'cash',
};

function resolveIconName(value: string | undefined): MarketingIconName {
  if (!value) return 'sparkle';
  if ((MARKETING_ICON_NAMES as readonly string[]).includes(value)) {
    return value as MarketingIconName;
  }
  return CATALOG_ICON_MAP[value] ?? 'sparkle';
}

interface Resolved {
  key: string;
  title: string;
  body: string;
  icon: MarketingIconName;
  tag?: string;
  price?: string;
  href: string;
}

function resolveItem(item: AddonSpotlightItem, locale: string, idx: number): Resolved | null {
  const tag = item.tag ?? item.badge;
  // Catalog-driven path: addonKey resolves to title/body/icon/href.
  if (isAddonKey(item.addonKey)) {
    const key = item.addonKey as AddonKey;
    const entry = getAddonEntry(key);
    const labels = getAddonLabels(key, locale);
    return {
      key: item.id ?? key,
      title: labels.title,
      body: labels.description,
      icon: resolveIconName(item.icon ?? entry.iconKey),
      tag,
      price: item.price,
      href: item.href ?? `/integrations/${entry.navHref.replace('/addons/', '')}`,
    };
  }

  // Free-form path: title/body must be supplied via icon/href; otherwise skip.
  if (!item.icon && !item.tag && !item.price && !item.href) {
    return null;
  }
  return {
    key: item.id ?? `addon-${idx}`,
    title: item.addonKey,
    body: '',
    icon: resolveIconName(item.icon),
    tag,
    price: item.price,
    href: item.href ?? '#',
  };
}

export function AddonSpotlight({ content, locale }: AddonSpotlightProps) {
  if (!content?.items?.length) return null;

  const resolved = content.items
    .map((it, idx) => resolveItem(it, locale, idx))
    .filter((r): r is Resolved => r !== null);

  if (resolved.length === 0) return null;

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <FadeIn>
            <h2 className="font-display text-balance text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              {content.headline}
            </h2>
          </FadeIn>
          {content.body && (
            <FadeIn delay={0.05}>
              <p className="mt-4 text-balance text-base text-marketing-fg-2 sm:text-lg">
                {content.body}
              </p>
            </FadeIn>
          )}
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resolved.map((item, i) => (
            <li key={item.key} className="h-full">
              <FadeIn delay={Math.min(i * 0.04, 0.32)} className="h-full">
                <Link
                  href={item.href}
                  className="group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-marketing-bg-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-lg border border-border bg-background text-foreground">
                      <MarketingIcon name={item.icon} size={20} />
                    </span>
                    {item.tag && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-marketing-fg-3">
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-medium tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  {item.body && <p className="flex-1 text-sm text-marketing-fg-2">{item.body}</p>}
                  {item.price && (
                    <div className="font-display text-sm font-medium text-foreground">
                      {item.price}
                    </div>
                  )}
                </Link>
              </FadeIn>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
