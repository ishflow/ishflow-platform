import { withBypass } from '@/platform/db/tenant-context';
/**
 * Stripe webhook dispatcher with idempotency.
 *
 * Every incoming Stripe event is recorded in the `BillingEvent` table keyed by
 * `stripeEventId`. The row's `processedAt` field acts as the idempotency
 * marker — replays of the same event short-circuit before any handler runs.
 *
 * Phase 1 (this task) registers no real handlers; events of unknown types are
 * recorded with `processingError = 'event_ignored'` and ack'd. Phase 2 will
 * call `registerHandler(...)` from outside this module.
 */
import type Stripe from 'stripe';

type HandlerFn = (event: Stripe.Event) => Promise<{ tenantId: string | null }>;

const HANDLERS: Record<string, HandlerFn> = {
  // Phase 2 task adds real handlers. For Task 1.4, leave empty + log.
};

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  // Idempotency: look up BillingEvent by stripeEventId. If processedAt set, skip.
  const existing = await withBypass((tx) =>
    tx.billingEvent.findUnique({ where: { stripeEventId: event.id } }),
  );
  if (existing?.processedAt) {
    return;
  }

  // Upsert (insert if first time, no-op if duplicate without processedAt — defensive).
  const row = await withBypass((tx) =>
    tx.billingEvent.upsert({
      where: { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        type: event.type,
        payload: event as unknown as object,
      },
      update: {},
    }),
  );

  const handler = HANDLERS[event.type];
  if (!handler) {
    await withBypass((tx) =>
      tx.billingEvent.update({
        where: { id: row.id },
        data: { processedAt: new Date(), processingError: 'event_ignored' },
      }),
    );
    return;
  }

  try {
    const result = await handler(event);
    await withBypass((tx) =>
      tx.billingEvent.update({
        where: { id: row.id },
        data: { processedAt: new Date(), tenantId: result.tenantId },
      }),
    );
  } catch (err) {
    await withBypass((tx) =>
      tx.billingEvent.update({
        where: { id: row.id },
        data: {
          processedAt: new Date(),
          processingError: err instanceof Error ? err.message.slice(0, 500) : String(err),
        },
      }),
    );
    throw err;
  }
}

/**
 * Exposed so Task 2.1 can register handlers from outside.
 */
export function registerHandler(eventType: string, fn: HandlerFn): void {
  HANDLERS[eventType] = fn;
}

/**
 * Test-only: clear all registered handlers so tests don't leak state.
 */
export function __resetHandlersForTests(): void {
  for (const key of Object.keys(HANDLERS)) {
    delete HANDLERS[key];
  }
}
