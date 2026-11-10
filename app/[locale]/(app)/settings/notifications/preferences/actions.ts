'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { setNotificationSettings } from '@/platform/notifications/settings';
import { revalidatePath } from 'next/cache';

export type NotificationPrefsState = { ok: true } | { ok: false; error: string } | null;

/**
 * Persists the tenant's notification preferences. Only the four real email
 * toggles + two thresholds that the dispatch-* senders actually consume are
 * accepted; everything else is ignored. Validation happens inside
 * `setNotificationSettings` via `notificationSettingsSchema`.
 */
export async function updateNotificationSettingsAction(
  _prev: NotificationPrefsState,
  formData: FormData,
): Promise<NotificationPrefsState> {
  const ctx = await requireTenantContext();

  const bool = (key: string) => {
    const raw = formData.get(key);
    return raw === 'on' || raw === 'true' || raw === '1';
  };
  const num = (key: string): number | undefined => {
    const raw = formData.get(key);
    if (raw === null || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  try {
    await setNotificationSettings(ctx.tenant.id, {
      invoiceSent: bool('invoiceSent'),
      paymentReceived: bool('paymentReceived'),
      lowStockAlert: bool('lowStockAlert'),
      overduePayment: bool('overduePayment'),
      lowStockThreshold: num('lowStockThreshold'),
      overdueDaysThreshold: num('overdueDaysThreshold'),
    });
    revalidatePath('/settings/notifications/preferences');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
