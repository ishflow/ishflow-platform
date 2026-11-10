import { withBypass } from '@/platform/db/tenant-context';
import { z } from 'zod';

export interface NotificationSettings {
  invoiceSent: boolean;
  paymentReceived: boolean;
  lowStockAlert: boolean;
  overduePayment: boolean;
  lowStockThreshold: number;
  overdueDaysThreshold: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  invoiceSent: true,
  paymentReceived: true,
  lowStockAlert: true,
  overduePayment: true,
  lowStockThreshold: 5,
  overdueDaysThreshold: 30,
};

export const notificationSettingsSchema = z.object({
  invoiceSent: z.boolean().default(DEFAULT_NOTIFICATION_SETTINGS.invoiceSent),
  paymentReceived: z.boolean().default(DEFAULT_NOTIFICATION_SETTINGS.paymentReceived),
  lowStockAlert: z.boolean().default(DEFAULT_NOTIFICATION_SETTINGS.lowStockAlert),
  overduePayment: z.boolean().default(DEFAULT_NOTIFICATION_SETTINGS.overduePayment),
  lowStockThreshold: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .default(DEFAULT_NOTIFICATION_SETTINGS.lowStockThreshold),
  overdueDaysThreshold: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(DEFAULT_NOTIFICATION_SETTINGS.overdueDaysThreshold),
});

/**
 * Resolves a tenant's notification preferences, merging the persisted JSON
 * column with the defaults so callers never have to null-check individual
 * fields. A null/missing column is treated as "all defaults".
 */
export async function getNotificationSettings(tenantId: string): Promise<NotificationSettings> {
  const tenant = await withBypass((tx) =>
    tx.tenant.findUnique({
      where: { id: tenantId },
      select: { notificationSettings: true },
    }),
  );
  return parseNotificationSettings(tenant?.notificationSettings ?? null);
}

/**
 * Persists a partial notification-settings patch onto the tenant's
 * `notificationSettings` JSON column. Reads current settings, merges the
 * partial, re-validates, and writes the full canonical object back.
 *
 * `notificationSettings` is a platform-level JSON column (NOT RLS-scoped), so
 * `withBypass` is the correct accessor — mirrors `getNotificationSettings`.
 */
export async function setNotificationSettings(
  tenantId: string,
  partial: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const current = await getNotificationSettings(tenantId);
  const merged = notificationSettingsSchema.parse({ ...current, ...partial });
  await withBypass((tx) =>
    tx.tenant.update({
      where: { id: tenantId },
      data: { notificationSettings: merged },
    }),
  );
  return merged;
}

export function parseNotificationSettings(raw: unknown): NotificationSettings {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
  const result = notificationSettingsSchema.safeParse(raw);
  if (!result.success) {
    // Loud failure: if the column was non-null but unparseable, the operator
    // set values won't take effect. Surface in prod logs so we can repair.
    console.warn('[notifications] failed to parse notification_settings', {
      issues: result.error.flatten().fieldErrors,
    });
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
  return result.data;
}
