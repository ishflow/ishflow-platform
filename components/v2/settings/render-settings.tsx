import '@/configs';

import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { getSettings } from '@/platform/engine/settings';
import { type Locale, getSettingsRegistry } from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared/pick-label';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { type SettingsLabels, V2SettingsForm } from './settings-form';

/**
 * Generic V2 settings page shell. Drives `/admin/<key>` + `/settings/<key>`
 * pages for singleton-per-tenant settings entities.
 *
 * Behavior:
 * 1. Resolve config from registry (notFound block when missing).
 * 2. Pre-resolve every label (config, fields, enum options, groups) against
 *    the current locale and shell-level i18n namespace.
 * 3. Load current row via `getSettings` (returns null if never set).
 * 4. Render Topbar + V2SettingsForm with the resolved labels + current values.
 *
 * User-scoped settings (config.scope === 'user') will route to a different
 * storage helper in Phase 3; for now they render but submit returns an error.
 *
 * @param slug Settings config id (e.g. 'admin.branding').
 */
export async function renderV2Settings({ slug }: { slug: string }) {
  const t = await getTranslations('v2_settings.shell');
  const tNav = await getTranslations('v2_nav');
  const locale = (await getLocale()) as Locale;

  const cfg = getSettingsRegistry().settings.get(slug);
  if (!cfg) {
    return (
      <>
        <V2Topbar breadcrumb="V2" title={t('notFound.title')} subtitle={slug} />
        <div className="content" />
      </>
    );
  }

  let tenantId = '';
  let tenantCurrency = '';
  let tenantName = '';
  let perms = new Set<string>();
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
    tenantCurrency = ctx.tenant?.currency ?? '';
    tenantName = ctx.tenant?.name ?? '';
    perms = ctx.permissions;
  } catch {
    /* unauthenticated */
  }

  // Workspace settings (general/organization/tax/security) are admin-only.
  // The nav already hides the Settings rail for roles without it; this blocks
  // a direct URL hit (e.g. a chief_accountant who only has admin.currency).
  if (tenantId && !hasPermission(perms, 'admin.organization:edit')) {
    notFound();
  }

  let current: Record<string, unknown> | null = null;
  if (tenantId && cfg.scope !== 'user') {
    current = await withTenant(tenantId, (tx) => getSettings(tx, tenantId, slug));
  }
  // The single operational currency + workspace name live on the `tenant` row,
  // not in the generic settings store — surface the REAL values so the form
  // never shows a stale placeholder. Save syncs them back (settings-actions).
  if (slug === 'admin.general' && tenantId) {
    current = {
      ...(current ?? {}),
      defaultCurrencyCode: tenantCurrency,
      workspaceName: tenantName,
    };
  }

  const titleLabel = pickLabel(cfg.label, locale);

  // Pre-resolve every label the client form might need so the 'use client'
  // boundary never re-runs i18n. Group legend lookup falls back to the raw
  // group id if the i18n key is missing — clearer signal during development
  // than a thrown MissingMessage.
  const fieldLabels: Record<string, string> = {};
  const enumOptionLabels: Record<string, string> = {};
  const groupKeys = new Set<string>();
  for (const [k, f] of Object.entries(cfg.fields)) {
    fieldLabels[k] = pickLabel(f.label, locale);
    if (f.group) groupKeys.add(f.group);
    if (f.type === 'string' && f.enumValues && f.enumValues.length > 0) {
      for (const opt of f.enumValues) {
        const lbl = f.enumLabels?.[opt];
        enumOptionLabels[`${k}.${opt}`] = lbl ? pickLabel(lbl, locale) : opt;
      }
    }
  }
  const groupLabels: Record<string, string> = {};
  for (const g of groupKeys) {
    try {
      groupLabels[g] = (await getTranslations('v2_settings.groups'))(g);
    } catch {
      groupLabels[g] = g;
    }
  }

  const labels: SettingsLabels = {
    field: fieldLabels,
    enumOption: enumOptionLabels,
    group: groupLabels,
    saveCta: safeT(t, 'save', 'Save'),
    saving: safeT(t, 'saving', 'Saving…'),
    saved: safeT(t, 'saved', 'Saved.'),
    errorPrefix: safeT(t, 'errorPrefix', 'Could not save:'),
    currencyChangeWarn: safeT(
      t,
      'currencyChangeWarn',
      'All amounts will be displayed in this currency from now on. Existing values are not recalculated. Continue?',
    ),
  };

  const breadcrumbRoot =
    cfg.module === 'admin' ? tNav('admin.section.main') : tNav('settings.section.main');

  return (
    <>
      <V2Topbar breadcrumb={`${breadcrumbRoot} / ${titleLabel}`} title={titleLabel} />
      <div className="content">
        <V2SettingsForm slug={slug} config={cfg} initialValues={current ?? {}} labels={labels} />
      </div>
    </>
  );
}

function safeT(t: (k: string) => string, key: string, fallback: string): string {
  try {
    const v = t(key);
    return v && v !== key ? v : fallback;
  } catch {
    return fallback;
  }
}
