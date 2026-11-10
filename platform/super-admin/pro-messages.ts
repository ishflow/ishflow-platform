/**
 * Super Admin Pro — i18n loader for the new pages (user detail, audit pro,
 * analytics).
 *
 * Strings live in `messages/<locale>.json` under the `superAdminPro`
 * top-level namespace so they can be translated via the regular i18n
 * pipeline. This module reads the SA-locale cookie, imports the matching
 * locale JSON, and returns the typed sub-tree.
 *
 * Fallback rules:
 *  1. Resolved SA locale (cookie → `en` default).
 *  2. If the resolved locale’s JSON is missing the namespace, fall back to
 *     `en.json` so newly added strings stay visible while translations
 *     trickle in.
 *
 * Server-only — runs inside server components / actions.
 */

import { getSuperAdminLocale } from './i18n-server';

type StringDict = {
  [key: string]: string | StringDict;
};

export interface SuperAdminProDict {
  users: {
    detail: {
      title: string;
      subtitle: string;
      identityCard: { title: string; description: string };
      identityRows: {
        email: string;
        name: string;
        clerkId: string;
        userId: string;
        createdAt: string;
        deletedAt: string;
      };
      memberships: {
        title: string;
        description: string;
        empty: string;
        columns: { tenant: string; roles: string; joined: string; actions: string };
        impersonate: string;
      };
      audit: {
        title: string;
        description: string;
        empty: string;
        columns: { when: string; action: string; tenant: string };
      };
      sessions: {
        title: string;
        description: string;
        empty: string;
        columns: { id: string; status: string; lastActive: string; expires: string };
        revoke: string;
        revokeAll: string;
      };
      pushTokens: {
        title: string;
        description: string;
        empty: string;
        columns: { platform: string; device: string; created: string; lastUsed: string };
      };
      actions: {
        title: string;
        description: string;
        passwordReset: string;
        passwordResetHint: string;
        passwordResetSuccess: string;
        revokeAllSessions: string;
        revokeAllSessionsHint: string;
        revokeAllSessionsSuccess: string;
        softDelete: string;
        softDeleteHint: string;
        softDeleteConfirm: string;
        softDeleteSuccess: string;
        confirmTitle: string;
      };
      deletedBadge: string;
      back: string;
    };
  };
  audit: {
    filters: {
      dateRangeLabel: string;
      dateFromLabel: string;
      dateToLabel: string;
      entityLabel: string;
      entityAll: string;
      categoryLabel: string;
      categoryAll: string;
      categories: {
        security: string;
        billing: string;
        addon: string;
        mutation: string;
        login: string;
        impersonation: string;
      };
      qLabel: string;
      qPlaceholder: string;
      qHint: string;
      savedTitle: string;
      savedEmpty: string;
      saveAs: string;
      saveAsPlaceholder: string;
      saveButton: string;
      deleteSaved: string;
      apply: string;
      reset: string;
      export: string;
    };
    diff: {
      title: string;
      description: string;
      addedLegend: string;
      removedLegend: string;
      changedLegend: string;
      unchangedLegend: string;
      noChanges: string;
    };
  };
  analytics: {
    title: string;
    subtitle: string;
    dau: {
      title: string;
      description: string;
      dauLabel: string;
      wauLabel: string;
      mauLabel: string;
    };
    cohort: {
      title: string;
      description: string;
      header: string;
      week1: string;
      week2: string;
      week4: string;
      week8: string;
      week12: string;
      empty: string;
      cohortColumn: string;
      sizeColumn: string;
    };
    funnel: {
      title: string;
      description: string;
      steps: {
        signup: string;
        onboarded: string;
        firstInvoice: string;
        firstPayment: string;
        retained7d: string;
      };
    };
    addonAdoption: {
      title: string;
      description: string;
      empty: string;
      columns: { addon: string; enabled: string; total: string; pct: string };
    };
    topProducts: {
      title: string;
      description: string;
      empty: string;
      columns: { rank: string; product: string; tenants: string; units: string; revenue: string };
    };
    topCustomers: {
      title: string;
      description: string;
      empty: string;
      columns: { rank: string; customer: string; invoices: string; revenue: string };
    };
    privacyNotice: string;
  };
}

function isPlainObject(value: unknown): value is StringDict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function loadNamespace(locale: string): Promise<StringDict | null> {
  try {
    const mod = (await import(`@/messages/${locale}.json`)) as { default: Record<string, unknown> };
    const ns = mod.default.superAdminPro;
    return isPlainObject(ns) ? ns : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the SA Pro dict for the active operator locale, with `en` fallback.
 *
 * The cast at the bottom is intentional — JSON files are authored to match
 * `SuperAdminProDict`, so a successful import + namespace lookup is treated
 * as the typed dict. A missing namespace falls back to `en`; a missing `en`
 * namespace throws (a build-time error worth catching loudly).
 */
export async function getSuperAdminProDict(): Promise<SuperAdminProDict> {
  const locale = await getSuperAdminLocale();
  const localeNs = await loadNamespace(locale);
  if (localeNs) return localeNs as unknown as SuperAdminProDict;
  const enNs = await loadNamespace('en');
  if (!enNs) {
    throw new Error('superAdminPro namespace missing from en.json');
  }
  return enNs as unknown as SuperAdminProDict;
}
