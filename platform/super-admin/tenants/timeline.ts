import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma } from '@prisma/client';

export type TimelineKind =
  | 'billing'
  | 'platform_audit'
  | 'addon_toggle'
  | 'suspension'
  | 'status_change';

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  /** Short i18n-able label like `billing.event_received`, `addon.enabled`. */
  label: string;
  /** Free-form short description. Always plain text (no markdown). */
  detail: string;
  actor: string | null;
  at: Date;
  payload: Prisma.JsonValue | null;
}

const DEFAULT_LIMIT = 200;

/**
 * Aggregate chronological events for one tenant from four sources:
 * 1. `billing_event` — Stripe webhooks + manual plan changes.
 * 2. `platform_audit_log` — operator console actions.
 * 3. `tenant_addon` — current addon state (treated as "enabled at" events).
 * 4. `tenant_suspension` — suspend + lift moments.
 *
 * Merged + sorted desc by timestamp. Capped at `limit` (default 200) to
 * keep the SA page fast; older entries are accessible via the dedicated
 * tabs (Subscription, Activity, Add-ons).
 */
export async function getTenantTimeline(
  tenantId: string,
  limit = DEFAULT_LIMIT,
): Promise<TimelineEntry[]> {
  return withBypass(async (tx) => {
    const [billing, audit, addons, suspension] = await Promise.all([
      tx.billingEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      tx.platformAuditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      tx.tenantAddon.findMany({ where: { tenantId } }),
      tx.tenantSuspension.findUnique({ where: { tenantId } }),
    ]);

    const merged: TimelineEntry[] = [];

    for (const ev of billing) {
      merged.push({
        id: `billing:${ev.id}`,
        kind: 'billing',
        label: ev.type,
        detail: ev.processingError ? `error: ${ev.processingError}` : ev.stripeEventId,
        actor: null,
        at: ev.createdAt,
        payload: ev.payload,
      });
    }

    for (const a of audit) {
      merged.push({
        id: `audit:${a.id}`,
        kind: 'platform_audit',
        label: a.action,
        detail: a.action,
        actor: a.actorClerkId,
        at: a.createdAt,
        payload: a.after ?? a.before ?? null,
      });
    }

    for (const ad of addons) {
      merged.push({
        id: `addon:${ad.tenantId}:${ad.addonKey}`,
        kind: 'addon_toggle',
        label: 'addon.enabled',
        detail: ad.addonKey,
        actor: ad.enabledBy,
        at: ad.enabledAt,
        payload: {
          addonKey: ad.addonKey,
          expiresAt: ad.expiresAt?.toISOString() ?? null,
          notes: ad.notes ?? null,
        } as Prisma.JsonValue,
      });
    }

    if (suspension) {
      merged.push({
        id: `suspension:open:${suspension.id}`,
        kind: 'suspension',
        label: 'tenant.suspended',
        detail: suspension.reason,
        actor: suspension.suspendedBy,
        at: suspension.suspendedAt,
        payload: {
          reason: suspension.reason,
        } as Prisma.JsonValue,
      });
      if (suspension.liftedAt) {
        merged.push({
          id: `suspension:lift:${suspension.id}`,
          kind: 'suspension',
          label: 'tenant.suspension_lifted',
          detail: '',
          actor: suspension.liftedBy,
          at: suspension.liftedAt,
          payload: null,
        });
      }
    }

    merged.sort((a, b) => b.at.getTime() - a.at.getTime());
    return merged.slice(0, limit);
  });
}
