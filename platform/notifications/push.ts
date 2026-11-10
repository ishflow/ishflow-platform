import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export interface PushSendResult {
  ok: boolean;
  errors: string[];
}

interface ExpoTicket {
  status?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send to Expo Push and report the real outcome. Expo returns HTTP 200 with a
 * per-message ticket array, so a dead/unregistered token (`DeviceNotRegistered`)
 * surfaces as `data[i].status === 'error'`, NOT as a network failure. We inspect
 * both the HTTP status and the tickets so callers can tell success from a
 * silently-rejected token. Never throws — failures come back as `{ ok: false }`.
 */
export async function sendPushToExpoTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<PushSendResult> {
  if (tokens.length === 0) return { ok: true, errors: [] };
  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const msg = `Expo push HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`;
      process.stderr.write(`sendPushToExpoTokens: ${msg}\n`);
      return { ok: false, errors: [msg] };
    }
    const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
    const errors = (json?.data ?? [])
      .filter((t) => t.status === 'error')
      .map((t) => t.details?.error ?? t.message ?? 'unknown push error');
    return { ok: errors.length === 0, errors };
  } catch (error) {
    const msg = (error as Error).message;
    process.stderr.write(`sendPushToExpoTokens: delivery failed (${msg})\n`);
    return { ok: false, errors: [msg] };
  }
}

export async function sendPushToUser(ctx: AppContext, payload: PushPayload): Promise<void> {
  if (!ctx.tenant) return;
  const tenantId = ctx.tenant.id;
  const userId = ctx.user.id;
  const tokens = await withTenant(tenantId, async (tx) => {
    const rows = (await (
      tx as unknown as {
        devicePushToken: {
          findMany: (a: unknown) => Promise<Array<{ token: string }>>;
        };
      }
    ).devicePushToken.findMany({
      where: { tenantId, userId },
      select: { token: true },
    })) as Array<{ token: string }>;
    return rows.map((r) => r.token);
  });
  await sendPushToExpoTokens(tokens, payload);
}
