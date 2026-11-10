/**
 * Premium addon catalog — source of truth for the 12 premium features that
 * super-admin can toggle per tenant from
 * /super-admin/tenants/[tenantId]/addons.
 *
 * Status legend:
 *   - `beta`    — implementation lives behind hasAddon(ctx, key); ready to
 *                 pilot.
 *   - `ga`      — same, but no warning copy.
 *   - `planned` — only a shell page at /addons/<key>. The catalog entry
 *                 exists so SA can pre-enable for a pilot tenant before the
 *                 implementation lands; once shipped, flip to `beta` or `ga`.
 */

export const ADDON_KEYS = [
  'ai_invoice_ocr',
  'bank_integration',
  'kkt_54fz',
  'marking_chestny_znak',
  'edo_integration',
  'esf_kazakhstan',
  'telegram_bot',
  'barcode_label_printer',
  'marketplace_sync',
  'multi_company',
  'b2b_portal',
  'ai_query',
  'oneC_migration',
] as const;

export type AddonKey = (typeof ADDON_KEYS)[number];

export type AddonStatus = 'ga' | 'beta' | 'planned';

export interface AddonCatalogEntry {
  readonly key: AddonKey;
  readonly status: AddonStatus;
  /** Lucide icon name (kebab-case maps to PascalCase in the React import). */
  readonly iconKey: string;
  /** The path the sidebar nav links to when the addon is enabled. */
  readonly navHref: string;
}

export const ADDON_CATALOG: Record<AddonKey, AddonCatalogEntry> = {
  ai_invoice_ocr: {
    key: 'ai_invoice_ocr',
    status: 'beta',
    iconKey: 'scan-text',
    navHref: '/addons/ai-invoice-ocr',
  },
  bank_integration: {
    key: 'bank_integration',
    status: 'beta',
    iconKey: 'landmark',
    navHref: '/addons/bank-import',
  },
  kkt_54fz: {
    key: 'kkt_54fz',
    status: 'planned',
    iconKey: 'printer',
    navHref: '/addons/kkt-54fz',
  },
  marking_chestny_znak: {
    key: 'marking_chestny_znak',
    status: 'planned',
    iconKey: 'qr-code',
    navHref: '/addons/marking-chestny-znak',
  },
  edo_integration: {
    key: 'edo_integration',
    status: 'planned',
    iconKey: 'file-signature',
    navHref: '/addons/edo',
  },
  esf_kazakhstan: {
    key: 'esf_kazakhstan',
    status: 'planned',
    iconKey: 'file-text',
    navHref: '/addons/esf-kazakhstan',
  },
  telegram_bot: {
    key: 'telegram_bot',
    status: 'planned',
    iconKey: 'send',
    navHref: '/addons/telegram-bot',
  },
  barcode_label_printer: {
    key: 'barcode_label_printer',
    status: 'planned',
    iconKey: 'barcode',
    navHref: '/addons/barcode-label-printer',
  },
  marketplace_sync: {
    key: 'marketplace_sync',
    status: 'planned',
    iconKey: 'shopping-cart',
    navHref: '/addons/marketplace-sync',
  },
  multi_company: {
    key: 'multi_company',
    status: 'planned',
    iconKey: 'building-2',
    navHref: '/addons/multi-company',
  },
  b2b_portal: {
    key: 'b2b_portal',
    status: 'planned',
    iconKey: 'users-round',
    navHref: '/addons/b2b-portal',
  },
  ai_query: {
    key: 'ai_query',
    status: 'planned',
    iconKey: 'message-circle-question',
    navHref: '/addons/ai-query',
  },
  oneC_migration: {
    key: 'oneC_migration',
    status: 'beta',
    iconKey: 'database-zap',
    navHref: '/addons/1c',
  },
};

const ADDON_KEY_SET: ReadonlySet<string> = new Set(ADDON_KEYS);

export function isAddonKey(value: string): value is AddonKey {
  return ADDON_KEY_SET.has(value);
}

export function getAddonEntry(key: AddonKey): AddonCatalogEntry {
  return ADDON_CATALOG[key];
}

export function listAddonEntries(): AddonCatalogEntry[] {
  return ADDON_KEYS.map((k) => ADDON_CATALOG[k]);
}

/**
 * Reverse lookup: addon home URL `/addons/<slug>` → AddonKey.
 *
 * Used by the dynamic shell route at `app/[locale]/(platform)/addons/[slug]`
 * to map back to the catalog entry from the URL segment.
 */
export function findAddonByHrefSlug(slug: string): AddonCatalogEntry | undefined {
  const target = `/addons/${slug}`;
  for (const key of ADDON_KEYS) {
    if (ADDON_CATALOG[key].navHref === target) {
      return ADDON_CATALOG[key];
    }
  }
  return undefined;
}
