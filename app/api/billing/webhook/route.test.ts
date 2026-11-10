import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import Stripe from 'stripe';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const constructEventMock = vi.fn();

vi.mock('@/platform/billing/stripe-client', () => ({
  stripe: () => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  }),
}));

import { POST } from './route';

const TEST_EVENT_PREFIX = 'evt_test_webhook_route_';
const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function makeEventId(): string {
  return `${TEST_EVENT_PREFIX}${randomUUID().replace(/-/g, '')}`;
}

function fakeStripeEvent(overrides: { id?: string; type?: string } = {}): Stripe.Event {
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

function makeRequest(body: string, signature: string | null): Request {
  return new Request('http://localhost:3000/api/billing/webhook', {
    method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : {},
    body,
  });
}

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
  }
});

beforeEach(() => {
  constructEventMock.mockReset();
});

afterEach(async () => {
  await withBypass((tx) =>
    tx.billingEvent.deleteMany({
      where: { stripeEventId: { startsWith: TEST_EVENT_PREFIX } },
    }),
  );
});

describe('POST /api/billing/webhook', () => {
  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeRequest('{}', null));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('missing_stripe_signature');
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it('returns 400 on signature verification failure', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Stripe.errors.StripeSignatureVerificationError({
        message: 'No signatures found matching the expected signature',
        type: 'invalid_request_error',
      });
    });

    const res = await POST(makeRequest('{}', 'v1,invalid'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('signature_verification_failed');
  });

  it('returns 200 for an unknown event type', async () => {
    const event = fakeStripeEvent({ type: 'mystery.event' });
    constructEventMock.mockReturnValue(event);

    const res = await POST(makeRequest(JSON.stringify(event), 'v1,fake'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('is idempotent — replaying the same event id is a no-op', async () => {
    const event = fakeStripeEvent({ type: 'mystery.event' });
    constructEventMock.mockReturnValue(event);

    const first = await POST(makeRequest(JSON.stringify(event), 'v1,fake'));
    expect(first.status).toBe(200);

    // Replay
    const second = await POST(makeRequest(JSON.stringify(event), 'v1,fake'));
    expect(second.status).toBe(200);

    const rows = await withBypass((tx) =>
      tx.billingEvent.findMany({ where: { stripeEventId: event.id } }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.processingError).toBe('event_ignored');
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is missing', async () => {
    const saved = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const res = await POST(makeRequest('{}', 'v1,fake'));
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('webhook_secret_missing');
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = saved;
    }
  });
});
