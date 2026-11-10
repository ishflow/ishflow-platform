/**
 * Resolver for in-app announcements.
 *
 * Called once per platform request from `app/[locale]/(platform)/layout.tsx`.
 * Returns the announcements that should currently surface to the viewer,
 * already localized and joined with the viewer's per-user state.
 *
 * Behavior summary (matches spec):
 *  1. Status = `live`, within optional [startAt, endAt) window.
 *  2. Targeting axes (plans/addons/roles/locales/tenantIds) all match.
 *  3. Banner surface: skip when the viewer dismissed it; popups can still
 *     fire again until viewed (handled by the popup component itself).
 *  4. Translations: prefer the active locale, then `en`, then any locale.
 *  5. Sort: createdAt desc.
 */

import type { AppContext } from '@/platform/auth/current-context';
import { effectivePlan } from '@/platform/billing/trial';
import { withBypass } from '@/platform/db/tenant-context';
import type { AnnouncementSurface } from '@prisma/client';
import { type ViewerTarget, matchesTargeting, parseTargeting } from './targeting';

export interface ResolvedAnnouncement {
  id: string;
  internalKey: string;
  surface: AnnouncementSurface;
  dismissible: boolean;
  ctaLabel: string | null;
  ctaUrl: string | null;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
  title: string;
  body: string;
  locale: string; // locale of the chosen translation
  /** Per-user state — `null` when the viewer has no row yet. */
  state: {
    viewedAt: Date | null;
    dismissedAt: Date | null;
    clickedThroughAt: Date | null;
    impressionCount: number;
  } | null;
}

interface LoadOptions {
  /** Force a locale override (e.g. for the What's New page using the active route locale). */
  locale?: string;
  /** Include dismissed banners (default: false — used by What's New feed). */
  includeDismissed?: boolean;
  /** When true, include archived announcements with viewer state (history feed). */
  includeArchived?: boolean;
}

function pickTranslation(
  translations: ReadonlyArray<{ locale: string; title: string; body: string }>,
  preferred: string,
): { title: string; body: string; locale: string } | null {
  if (translations.length === 0) return null;
  const exact = translations.find((t) => t.locale === preferred);
  if (exact) return exact;
  const en = translations.find((t) => t.locale === 'en');
  if (en) return en;
  const first = translations[0];
  return first ?? null;
}

function viewerRoleNames(ctx: AppContext): string[] {
  const membership = ctx.membership;
  if (!membership) return [];
  // Membership include is `roles: { include: { scopes: true } }`, so each
  // role object carries its `name` field even though the public TS type
  // only narrows to `{ id, permissions, scopes }`. Cast carefully.
  const roles = (membership as unknown as { roles?: Array<{ name?: string }> }).roles ?? [];
  return roles
    .map((r) => (typeof r.name === 'string' ? r.name : null))
    .filter((n): n is string => n !== null);
}

export async function loadActiveAnnouncements(
  ctx: AppContext,
  options: LoadOptions = {},
): Promise<ResolvedAnnouncement[]> {
  const tenant = ctx.tenant;
  // Without a tenant we can't compute plan/locale; bail out fast.
  if (!tenant) return [];

  const locale = options.locale ?? tenant.defaultLocale ?? 'en';
  const viewer: ViewerTarget = {
    plan: effectivePlan(tenant),
    addons: ctx.addons,
    roles: viewerRoleNames(ctx),
    locale: tenant.defaultLocale ?? 'en',
    tenantId: tenant.id,
  };

  const now = new Date();

  return withBypass(async (tx) => {
    const rows = await tx.marketingAnnouncement.findMany({
      where: {
        status: options.includeArchived ? { in: ['live', 'archived'] } : 'live',
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gt: now } }] },
        ],
      },
      include: {
        translations: true,
        userStates: {
          where: { userId: ctx.user.id },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const out: ResolvedAnnouncement[] = [];
    for (const r of rows) {
      const targeting = parseTargeting(r.targeting);
      if (!matchesTargeting(targeting, viewer)) continue;

      const state = r.userStates[0] ?? null;
      if (!options.includeDismissed && r.surface === 'banner' && state?.dismissedAt) {
        continue;
      }

      const tr = pickTranslation(r.translations, locale);
      if (!tr) continue;

      out.push({
        id: r.id,
        internalKey: r.internalKey,
        surface: r.surface,
        dismissible: r.dismissible,
        ctaLabel: r.ctaLabel,
        ctaUrl: r.ctaUrl,
        startAt: r.startAt,
        endAt: r.endAt,
        createdAt: r.createdAt,
        title: tr.title,
        body: tr.body,
        locale: tr.locale,
        state: state
          ? {
              viewedAt: state.viewedAt,
              dismissedAt: state.dismissedAt,
              clickedThroughAt: state.clickedThroughAt,
              impressionCount: state.impressionCount,
            }
          : null,
      });
    }
    return out;
  });
}

/** Number of feed-visible items the viewer has not yet acknowledged. */
export async function countUnreadAnnouncements(ctx: AppContext): Promise<number> {
  const all = await loadActiveAnnouncements(ctx, { includeDismissed: true });
  return all.filter((a) => !a.state?.viewedAt).length;
}
