import { handleStripeWebhook } from '@/platform/billing/handle-webhook';
/**
 * Stripe webhook endpoint.
 *
 * Stripe POSTs raw JSON here and signs the request with the secret stored in
 * `STRIPE_WEBHOOK_SECRET`. We verify the signature against the raw body
 * (Next.js gives us a Web Request, so we use `request.text()`), then hand the
 * event to `handleStripeWebhook` which records + dispatches it.
 *
 * Important: this route MUST run on the Node.js runtime — the Stripe SDK
 * relies on Node crypto.
 *
 * Important: we always return 2xx unless we *intentionally* want Stripe to
 * retry (signature verification fails → 400; handler throws → 500).
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
// Side-effect import: registers all 7 Stripe event handlers with the dispatcher.
import '@/platform/billing/handlers';
import { stripe } from '@/platform/billing/stripe-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'webhook_secret_missing' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_stripe_signature' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: 'signature_verification_failed' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'event_construction_failed', message: (err as Error).message },
      { status: 400 },
    );
  }

  try {
    await handleStripeWebhook(event);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Letting Stripe retry — return 500 so it backs off and retries later.
    return NextResponse.json(
      { error: 'handler_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
