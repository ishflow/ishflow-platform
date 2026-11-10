/**
 * Stripe handler registry. Importing this module side-effects all 7 handlers
 * into the dispatcher's HANDLERS map. The webhook route imports this once at
 * the top so handlers are wired by the time the first event is dispatched.
 */
import { registerHandler } from '../handle-webhook';
import { handleCheckoutCompleted } from './checkout-completed';
import { handlePaymentFailed } from './payment-failed';
import { handlePaymentSucceeded } from './payment-succeeded';
import { handleSubscriptionCreated } from './subscription-created';
import { handleSubscriptionDeleted } from './subscription-deleted';
import { handleSubscriptionUpdated } from './subscription-updated';
import { handleTrialWillEnd } from './trial-will-end';

registerHandler('checkout.session.completed', handleCheckoutCompleted);
registerHandler('customer.subscription.created', handleSubscriptionCreated);
registerHandler('customer.subscription.updated', handleSubscriptionUpdated);
registerHandler('customer.subscription.deleted', handleSubscriptionDeleted);
registerHandler('invoice.payment_failed', handlePaymentFailed);
registerHandler('invoice.payment_succeeded', handlePaymentSucceeded);
registerHandler('customer.subscription.trial_will_end', handleTrialWillEnd);
