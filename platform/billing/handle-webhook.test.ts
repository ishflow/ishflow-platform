import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __resetHandlersForTests, handleStripeWebhook, registerHandler } from './handle-webhook';

const TEST_EVENT_PREFIX = 'evt_test_handler_';

function makeEventId(): string {
  return `${TEST_EVENT_PREFIX}${randomUUID().replace(/-/g, '')}`;
}

async function findEventById(stripeEventId: string) {
  return withBypass((tx) => tx.billingEvent.findUnique({ where: { stripeEventId } }));
}

function fakeEvent(overrides: { id?: string; type?: string } = {}): Stripe.Event {
  return {
    id: overrides.id ?? makeEventId(),
    object: 'event',
    type: overrides.type ?? 'noop.unknown',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: { object: {} },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  __resetHandlersForTests();
});

afterEach(async () => {
  __resetHandlersForTests();
  await withBypass((tx) =>
    tx.billingEvent.deleteMany({
      where: { stripeEventId: { startsWith: TEST_EVENT_PREFIX } },
    }),
  );
});

describe('handleStripeWebhook', () => {
  it('records an unknown event and marks processingError=event_ignored', async () => {
    const event = fakeEvent({ type: 'mystery.event' });

    await handleStripeWebhook(event);

    const row = await findEventById(event.id);
    expect(row).not.toBeNull();
    expect(row?.type).toBe('mystery.event');
    expect(row?.processedAt).toBeInstanceOf(Date);
    expect(row?.processingError).toBe('event_ignored');
    expect(row?.tenantId).toBeNull();
  });

  it('is idempotent — replaying the same event id is a no-op after processing', async () => {
    const event = fakeEvent({ type: 'mystery.event' });

    await handleStripeWebhook(event);
    const firstProcessedAt = (await findEventById(event.id))?.processedAt;
    expect(firstProcessedAt).toBeInstanceOf(Date);

    // Replay with same id but a *different* type — if the dispatcher were not
    // idempotent it would either re-process or update fields. It must do
    // neither.
    await handleStripeWebhook(fakeEvent({ id: event.id, type: 'something.else' }));

    const after = await findEventById(event.id);
    expect(after?.type).toBe('mystery.event');
    expect(after?.processedAt?.getTime()).toBe(firstProcessedAt?.getTime());
  });

  it('runs the registered handler and stores tenantId on success', async () => {
    let called = false;
    registerHandler('test.success', async () => {
      called = true;
      return { tenantId: null };
    });
    const event = fakeEvent({ type: 'test.success' });

    await handleStripeWebhook(event);

    expect(called).toBe(true);
    const row = await findEventById(event.id);
    expect(row?.processedAt).toBeInstanceOf(Date);
    expect(row?.processingError).toBeNull();
  });

  it('records processingError and rethrows when handler throws', async () => {
    registerHandler('test.fail', async () => {
      throw new Error('boom');
    });
    const event = fakeEvent({ type: 'test.fail' });

    await expect(handleStripeWebhook(event)).rejects.toThrow('boom');

    const row = await findEventById(event.id);
    expect(row?.processedAt).toBeInstanceOf(Date);
    expect(row?.processingError).toBe('boom');
  });

  it('truncates error messages to 500 chars', async () => {
    const longMessage = 'x'.repeat(800);
    registerHandler('test.long', async () => {
      throw new Error(longMessage);
    });
    const event = fakeEvent({ type: 'test.long' });

    await expect(handleStripeWebhook(event)).rejects.toThrow();

    const row = await findEventById(event.id);
    expect(row?.processingError?.length).toBe(500);
  });
});
